
-- To the programmer who will work on this in future:

-- Feel priveledged to read this code since its truly one of the most
-- complicated logic I have ever written and conceptualized.
-- I have added as many comments as I could to make your life easier.
-- With comments, it should be a cakewalk but its a nightmare without those
-- If you find something stupid, its not because of lack of my skill
-- but due to the lack of time I had while I coded it and due to my laziness
-- to rectify it later. However, I have tried my best to make sure performance
-- is not compromised. There is a lot of scope for indexing which I have left for
-- future since I want to see how much of data can this logic handle
-- without any db optimizations

CREATE OR REPLACE FUNCTION store_contacts(p_user integer, p_iso text, p_phone integer, p_contacts json) 
RETURNS json AS
$$
DECLARE
  v_max_contact_id integer;
  row_cnt integer;  
  v_max_phone_id integer;
  v_notification_id integer;

BEGIN

-- contacts is an array where each element is:
-- {
-- 	'contactId': 
-- 	'name': 
-- 	'email': [],
-- 	'phone': []
-- }

DROP TABLE IF EXISTS t_sc_contact2;
DROP TABLE IF EXISTS t_sc_contact1;
DROP TABLE IF EXISTS t_contacts;
DROP TABLE IF EXISTS t_contacts_temp1;
DROP TABLE IF EXISTS t_contacts_temp2;
DROP TABLE IF EXISTS t_contacts_temp3;
DROP TABLE IF EXISTS t_contacts_of_found;
DROP TABLE IF EXISTS t_coc_of_found;
DROP TABLE IF EXISTS t_hellos_users;
DROP TABLE IF EXISTS t_hellos_users_distinct;
DROP TABLE IF EXISTS t_hellos_users_final;
DROP TABLE IF EXISTS t_hellos_user_other_ph;
DROP TABLE IF EXISTS t_unique_contacts;
DROP TABLE IF EXISTS t_distinct_phone;
DROP TABLE IF EXISTS t_contacts_distinct;
DROP TABLE IF EXISTS t_contacts_old;
DROP TABLE IF EXISTS t_result;
DROP SEQUENCE IF EXISTS contact_sequence;
DROP SEQUENCE IF EXISTS phone_sequence;


select max(id) into v_max_contact_id from contact;

IF v_max_contact_id is null THEN 
	v_max_contact_id = 0;
END IF;

v_max_contact_id := v_max_contact_id +1;

execute 'alter sequence contact_id_seq restart with ' ||  v_max_contact_id; 

-- Reset the sequence of contact table
-- This is necessary since this procedure inserts a lot of records with the id specified
-- When one inserts into a serial column with id specified, sequence is not incremented automatically
-- To make up for that mess, its necessary and safe to reset the counter to the
-- max value before proceeding further

-- Check if user is added to the sayhellos' (phone.id = 1) contacts ?

create temporary table t_sc_contact1 as
select 1 
from contact c, contact_contact__phone_id ccpi
where c.phone = 1 
and c.id = ccpi.contact_contact
and ccpi.phone_id = p_phone;

GET DIAGNOSTICS row_cnt = ROW_COUNT;

IF row_cnt = 0 THEN
	--If not then add user to sayhellos' contacts
	with new_contact as (insert into contact(phone) values (1) returning id), 
	 new_ccpi as (insert into contact_contact__phone_id (contact_contact, phone_id)
		select id, p_phone from new_contact returning * 
	 )
	 insert into contactphonelinkage (contact, phone_id)
		select id, p_phone from new_contact;
END IF;

create temporary table t_sc_contact2 as
select 1 
from contact c, contact_contact__phone_id ccpi
where c.phone = p_phone 
and c.id = ccpi.contact_contact
and ccpi.phone_id = 1;

-- Check if sayhellos is added to user's contacts

GET DIAGNOSTICS row_cnt = ROW_COUNT;

IF row_cnt = 0 THEN
	-- add sayhellos to user's contacts if not added already
	with new_contact as (insert into contact(phone) select p_phone returning id), 
	 new_ccpi as (insert into contact_contact__phone_id (contact_contact, phone_id)
		select id, 1 from new_contact returning * 
	 )
	 insert into contactphonelinkage (contact, phone_id)
		select id, 1 from new_contact;
END IF;

-- Contacts is a json array containing json objects of each contacts

create temporary table t_contacts_temp1 as
select p_iso as iso, p_phone as phone, p_contacts as contacts;

-- normalize (unwind) contacts

create temporary table t_contacts_temp2 as
select iso, phone, json_array_elements(contacts) as contact 
from t_contacts_temp1;

-- Extract info from each contact object

create temporary table t_contacts_temp3 as
 select iso
 , phone 
 , cast(contact->>'contactId' as integer) as contactid
 , contact->>'name' as name
 , contact->'phone' as phones
 , contact->'email' as email
 from t_contacts_temp2;

-- Email is still a json array of email ids 
-- phones is a json array of phone numbers 

create temporary table t_contacts_old as
	select row_number() over() as rownum_old 
	, iso
	, phone
	, contactid
	, name
	, replace(cast(json_array_elements(phones) as text),'"','') as number
	, email
	, cast(null as integer) as found -- will contain id from phone table if found
	, cast(null as integer) as linked -- will contain id from contact table if found
	, false as intl 
  , cast(null as integer) as "user" -- will contain owner from phone table if found
  , cast(null as integer) as db_contact_id
  , cast(null as integer) as db_phone_id
  , false as is_allowed
	from t_contacts_temp3;

-- Above rownum generates same rownum for each entry with json_array_elements
-- Hence rownum again

create temporary table t_contacts as
	select row_number() over() as rownum, * from t_contacts_old;

-- number will be either a valid intl number or not. 
-- While parsing in sails controller, I need to prepend the number
-- A prefix i means intl number and x means parsing the number did not yield a valid intl number.

update t_contacts
  set intl = case when left(number,1) = 'i' then true else false end;

update t_contacts
  set number = right(number,-1);

update t_contacts tc
  set found = p.id,
      "user" = p.owner  
  from phone p
  where  ( tc.intl = true and tc.number = p.intl )
  OR  ( tc.intl = false and tc.number = p.number and p.intl is null );

-- found will point to the phone.id if the phone number exists in our DB
-- Update "user" if contact is linked to a hellos user

update t_contacts tc
  set linked = c.id
  from contact c, contact_contact__phone_id ccpi
  where tc.phone = c.phone 
  and c.id = ccpi.contact_contact
  and ccpi.phone_id = tc.found;

-- Check if the contact already exists in the contacts of user

create temporary table t_contacts_distinct as
	select contactid, number, min(rownum) as minrow
	from t_contacts
	group by contactid, number;

-- If the same number (intl representation same) is present in the contacts,
-- delete the duplicate

delete from t_contacts tc 
	using t_contacts_distinct tcd
	where tc.contactid = tcd.contactid
	and tc.number = tcd.number
	and tc.rownum <>  tcd.minrow;

-- Deleted duplicates in same contact 

-- If a contactid is linked to hellos user, and contains multiple
-- numbers but others are not linked to the hellos user
-- Delete the other numbers

create temporary table t_contacts_of_found as
	select distinct c.phone, ccpi.phone_id
	from t_contacts tc, contact c, contact_contact__phone_id ccpi
	where tc.found = c.phone
	and tc.found <> 1
	and c.id = ccpi.contact_contact
	and ccpi.phone_id <> 1
	and tc.found is not null
	and tc."user" is not null;

-- I need to check whether p_user exists in the contacts of hellos users 
-- in its contacts book, or if it exists in their contacts of contacts

update t_contacts tc
	set is_allowed = true
	from t_contacts_of_found tcof
	where tc.found = tcof.phone
	and tcof.phone_id = tc.phone;

-- Check in contacts of those with found true not null user not null
-- if its there, set is_allowed true

create temporary table t_coc_of_found as
	select tcof.phone, ccpi.phone_id
	from t_contacts_of_found tcof, contact c, contact_contact__phone_id ccpi
	where tcof.phone_id = c.phone
	and c.id = ccpi.contact_contact
	and ccpi.phone_id = p_phone;

-- Fetch contacts of contacts of those with found not null and user not null

update t_contacts tc
	set is_allowed = true
	from t_coc_of_found tcocof
	where tc.found = tcocof.phone;

-- Check if user exists in contacts of contacts of those
-- and set is_allowed accordingly

insert into notification ( user_ids, kind , "user" )
	select array_to_json(array_agg(distinct u.id)) as user_ids, 'request' as kind, p_user as "user"
	from t_contacts tc, users u
	where u.id = tc."user"
	and tc.found is not null
	and tc."user" is not null
	and tc.is_allowed = false
	and tc."user" not in ( select allowed_by from allowed where allowed_user = p_user )
RETURNING id into v_notification_id;

-- I need to send add requests to those who are added to my contacts
-- but their settings dont allow me to add them
-- So I will store the list of those contacts in notification table 
-- And use the notification id to send those add requests later in the 
-- javascript code

-- There is a table allowed being used above

delete from allowed a
	using t_contacts tc
	where tc."user" = a.allowed_by
	and tc.is_allowed = false
	and a.allowed_user = p_user;

-- Then I remove those contacts so that they are not added to my contacts on the server

create temporary table t_hellos_users as
select distinct "user" as user_id, contactid 
from t_contacts 
where is_allowed = true or "user" = p_user or t_contacts.found = 1;

-- Store hellos users who can be added to my contacts
-- There can be numbers in my contact book which are linked to myself
-- Need to send that too
-- Also need to send back a contact if it points to sayhellos

delete from t_contacts tc 
	using t_hellos_users thu 
	where tc.contactid = thu.contactid
	and tc."user" is null;

-- For contacts linked to hellos user, if I have an additional number
-- which is not linked to that user on hellos yet, need to remove that entry
-- Front end will send a request update to that hellos user

create temporary table t_hellos_users_distinct as
	select "user", number, min(rownum) as minrow
	from t_contacts 
	where is_allowed = true or "user" = p_user
	group by "user", number;

-- If a number linked to hellos user is present in multiple entries in my
-- phone book, then keep only one and delete the rest

delete from t_contacts tc 
	using t_hellos_users_distinct thud 
	where thud."user" = tc."user"
	and thud.number = tc.number 
	and tc.rownum <> thud.minrow;

-- If multiple contacts contain same number which is linked to a hellos user
-- we keep only one and discard others 

-- CHECKPOINT in future we will have to make sure instead of deleting these records,
-- we dump them somewhere else or mark them as invalid

create temporary table t_hellos_user_other_ph as
select distinct owner as "user", id as phone_id, intl as number 
from phone where owner in ( select distinct user_id from t_hellos_users );

-- Fetch all the phones of hellos users linked

delete from t_hellos_user_other_ph thuop 
	using t_contacts tc
	where thuop."user" = tc."user"
	and thuop.phone_id = tc.found;

-- Ignore the phones of hellos users which are already in t_contacts

insert into t_contacts 
	(
		iso
		, phone
		, number
		, found
		, intl 
	  , "user" -- will contain owner from phone table if found
	  , is_allowed
	)
	select 
		p_iso
		, p_phone
		, number
		, phone_id
		, true
		, "user"
		, true
		from t_hellos_user_other_ph ;	

update contactphonelinkage as cpl 
	set email = tc.email,
			name = tc.name,
			"contactId" = tc.contactid
	from t_contacts as tc 
	where cpl.contact = tc.linked
	and cpl.phone_id = tc.found;

-- If an existing contact is received, update its details in contactphonelinkage
-- eg name, emails, contactId etc

delete from t_contacts where linked is not null;

-- Skip records which are already present in the contacts

delete from t_contacts where "user" is not null and is_allowed = false;

-- These are the contacts that dont allow me to add them as per their settings
-- They will receive add requests

-- Insertion to contacts begins from here onwards
create temporary table t_unique_contacts as
	select distinct phone, contactid, cast(null as integer) as db_contact_id
	from t_contacts;

create temporary table t_distinct_phone as
	select distinct number , iso, intl, cast(null as integer) as db_phone_id
	from t_contacts
	where t_contacts.found is null;

LOCK TABLE contact IN ACCESS EXCLUSIVE MODE;

select max(id) into v_max_contact_id from contact;

IF v_max_contact_id is null THEN 
	v_max_contact_id = 0;
END IF;

RAISE NOTICE 'value of v_max_contact_id %', v_max_contact_id;

v_max_contact_id := v_max_contact_id + 1;
EXECUTE 'CREATE SEQUENCE contact_sequence START ' || v_max_contact_id;

update t_unique_contacts
	set db_contact_id = nextval('contact_sequence'); 

update t_contacts tc
  set db_contact_id = tuc.db_contact_id
  from t_unique_contacts tuc
  where tc.contactid = tuc.contactid;

insert into contact (id, phone, "createdAt", "updatedAt") 
	select distinct db_contact_id, phone, now(), now() from t_unique_contacts;
-- Contact records need to be created for all eventually

-- complete transaction

insert into contact_contact__phone_id (contact_contact, phone_id) 
	select db_contact_id, t_contacts.found
	from t_contacts
	where t_contacts.found is not null;

insert into contactphonelinkage(contact, phone_id, name, "contactId", email)
	select db_contact_id, t_contacts.found, name, contactid, email
	from t_contacts
	where t_contacts.found is not null;

-- Create phone records for those with found = null. 
-- Those with intl true will have both intl and number populated
-- Those with intl false will have only number populated

LOCK TABLE phone IN ACCESS EXCLUSIVE MODE;
	
select max(id) into v_max_phone_id from phone;

IF v_max_phone_id is null THEN 
	v_max_phone_id = 0;
END IF;

RAISE NOTICE 'value of v_max_contact_id %', v_max_contact_id;

v_max_phone_id := v_max_phone_id + 100;
EXECUTE 'CREATE SEQUENCE phone_sequence START ' || v_max_phone_id;

update t_distinct_phone
	set db_phone_id = nextval('phone_sequence');

update t_contacts tc
  set db_phone_id = tdp.db_phone_id
  from t_distinct_phone tdp
  where tc.number = tdp.number 
  and tc.found is null;

insert into phone (id, iso, number, intl, "createdAt", "updatedAt")
	select db_phone_id, iso, number
	, case when intl = true then number else null end
	, now(), now()
	from t_distinct_phone tdp;



insert into contact_contact__phone_id (contact_contact, phone_id) 
	select db_contact_id, db_phone_id
	from t_contacts
	where t_contacts.found is null;

insert into contactphonelinkage(contact, phone_id, name, "contactId", email, "createdAt", "updatedAt")
	select db_contact_id, db_phone_id, name, contactid, email, now(), now()
	from t_contacts
	where t_contacts.found is  null;


create temporary table t_hellos_users_final as
	select u.id, u.handle, thu.contactid
	from users u, t_hellos_users thu 
	where u.id = thu.user_id;

create temporary table t_result as
select v_notification_id as notification_id , array_to_json(array_agg(t_hellos_users_final)) as hellos_users
FROM t_hellos_users_final;

select max(id) into v_max_contact_id from contact;

IF v_max_contact_id is null THEN 
	v_max_contact_id = 0;
END IF;


v_max_contact_id := v_max_contact_id +1;

execute 'alter sequence contact_id_seq restart with ' ||  v_max_contact_id; 


return row_to_json(t_result) from t_result;

END;
$$             
LANGUAGE 'plpgsql';

