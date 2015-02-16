CREATE OR REPLACE FUNCTION add_via_handle(p_user integer, p_handle text, p_allow boolean default false) 
RETURNS json AS
$$
DECLARE
  perm integer;
  row_cnt integer;
  user_id integer;
BEGIN

DROP TABLE IF EXISTS t_phones;
DROP TABLE IF EXISTS t_user;
DROP TABLE IF exists t_contacts;
DROP TABLE IF exists t_adders_phones;
DROP TABLE IF exists t_found_in_contacts;
DROP TABLE IF exists t_contacts_of_contacts;
DROP TABLE IF exists t_found_in_coc;
DROP TABLE IF exists t_already_added;

RAISE NOTICE 'STARTING ADD via handle';

create temporary table t_adders_phones as
select distinct id as phone_id 
from phone 
where owner = p_user
and verified = true;

create temporary table t_user as
select users.*, false as added, false as linked 
from users 
where handle = p_handle;

GET DIAGNOSTICS row_cnt = ROW_COUNT;

IF row_cnt = 0 THEN
  RAISE EXCEPTION 'user % not found', p_handle;
END IF;

create temporary table t_already_added as
  select distinct u.id
  from t_adders_phones tap, phone p, contact c, contact_contact__phone_id ccpi, phone cp, users u, t_user tu
  where tap.phone_id = p.id
  and c.phone = p.id
  and ccpi.contact_contact = c.id
  and cp.id = ccpi.phone_id
  and cp.verified = true
  and cp.owner = u.id
  and u.id = tu.id;

GET DIAGNOSTICS row_cnt = ROW_COUNT;

IF row_cnt > 0 THEN
  update t_user set linked = true;
  return row_to_json(t_user) from t_user;
END IF;

IF p_allow = true THEN
  update t_user set added = true; 
  return row_to_json(t_user) from t_user;
END IF;

select id,permission into user_id,perm from t_user;

create temporary table t_phones as
select distinct id as phone_id
from phone 
where owner = user_id
and verified = true;

CASE perm
  
  WHEN 3 THEN
    update t_user set added = true;
    return row_to_json(t_user) from t_user;
  
  WHEN 1,2 THEN
    create temporary table t_contacts AS
      select distinct ccpi.phone_id 
      from t_phones tp, contact c, contact_contact__phone_id ccpi 
      where tp.phone_id = c.phone  
      and c.id = ccpi.contact_contact;

    create temporary table t_found_in_contacts AS
    	select tc.phone_id 
    	from t_contacts tc, t_adders_phones tap
    	where tc.phone_id = tap.phone_id;

    GET DIAGNOSTICS row_cnt = ROW_COUNT;
		IF row_cnt > 0 THEN
			RAISE NOTICE 'found in contacts';
      update t_user set added = true;
		  return row_to_json(t_user) from t_user;
		END IF;

	WHEN 2 THEN
    create temporary table t_contacts_of_contacts AS
      select distinct ccpi.phone_id 
      from t_contacts tc, contact c, contact_contact__phone_id ccpi
      where tc.phone_id = c.phone
      and c.id = ccpi.contact_contact;

		create temporary table t_found_in_coc AS
    	select tcoc.phone_id 
    	from t_contacts_of_contacts tcoc, t_adders_phones tap
    	where tcoc.phone_id = tap.phone_id;

    GET DIAGNOSTICS row_cnt = ROW_COUNT;
		IF row_cnt > 0 THEN
		  RAISE NOTICE 'found in contacts of contacts';
      update t_user set added = true;
		  return row_to_json(t_user) from t_user;
		END IF;

  ELSE RAISE EXCEPTION 'User privacy settings are incorrect';
END CASE;

return row_to_json(t_user) from t_user;

END;
$$             
LANGUAGE 'plpgsql';
