CREATE OR REPLACE FUNCTION add_request(p_user integer, p_notification integer) 
RETURNS json AS
$$
DECLARE

BEGIN

DROP TABLE IF EXISTS t_result;
DROP TABLE IF EXISTS t_my_contacts;
DROP TABLE IF EXISTS t_other_contacts;
DROP TABLE IF EXISTS t_other_users;
DROP TABLE IF EXISTS t_other_contacts_dtl;
DROP TABLE IF EXISTS t_other_contacts_temp;

create temporary table t_my_contacts AS
	select distinct u.id contact_user_id , u.handle, u.name
	from phone p, contact c, contact_contact__phone_id ccpi , phone cp, users u
	where p.owner = p_user
	and p.verified = true
	and c.phone = p.id
	and ccpi.contact_contact = c.id
	and cp.id = ccpi.phone_id
	and cp.owner = u.id
	and cp.verified = true
	and u.id <> p_user;

create temporary table t_other_users AS
	select cast(cast(json_array_elements(user_ids) as text) as integer) as id
	from notification where id = p_notification;

delete from t_other_users where id = p_user;

create temporary table t_other_contacts_temp as
	select distinct tou.id as owner_user_id , u.id as contact_user_id, u.handle, u.name
	from t_other_users tou, phone p, contact c, contact_contact__phone_id ccpi , phone cp, users u
	where p.owner = tou.id
	and c.phone = p.id
	and p.verified = true
	and ccpi.contact_contact = c.id
	and cp.id = ccpi.phone_id
	and cp.verified = true
	and cp.owner = u.id;

create temporary table t_other_contacts as
	select tou.id as owner_user_id, toc.contact_user_id, toc.handle, toc.name
	from t_other_users tou left outer join t_other_contacts_temp toc on tou.id = toc.owner_user_id;

-- remove uncommon contacts
delete from t_other_contacts where contact_user_id not in (select contact_user_id from t_my_contacts);

-- create temporary table t_other_contacts_dtl as
-- 	select u.reg_id as owner_reg_id, u.id as owner_id, toc.contact_user_id, toc.handle, toc.name
-- 	from users u, t_other_contacts toc
-- 	where toc.owner_user_id = u.id
-- 	and u.reg_id is not null;

-- update t_other_contacts_dtl set 
-- 	contact_user_id = null,
-- 	handle = null,
-- 	name = null
-- 	where owner_id = contact_user_id;


create temporary table t_other_contacts_dtl as
  select u.reg_id as owner_reg_id,toc.contact_user_id, u.id as owner_id, toc.name
  from users u, t_other_contacts toc
  where toc.owner_user_id = u.id
  and u.reg_id is not null;

update t_other_contacts_dtl set 
  name = null
  where owner_id = contact_user_id;

update t_other_contacts_dtl set
  name  = null 
  where contact_user_id = 1;

alter table t_other_contacts_dtl
drop owner_id;

create temporary table t_result as
	select owner_reg_id, array_to_json(array_agg(t_other_contacts_dtl)) as common 
	from t_other_contacts_dtl 
	group by owner_reg_id;



return array_to_json(array_agg(t_result)) from t_result;

END;
$$             
LANGUAGE 'plpgsql';
