CREATE OR REPLACE FUNCTION remove_contact(p_user integer, p_all boolean,  p_contact_phone text,  p_intl boolean, p_name text default null) 
RETURNS integer AS
$$
DECLARE

  row_cnt integer;
	sqlQuery text;

BEGIN

DROP TABLE IF EXISTS t_rc_contact;

-- create a table contact_phones which contains number and intl flag
-- number will be either intl representation or number as it is depending on intl flag
-- if intl flag is true then intl otherwise number as is

create temporary table t_rc_contact AS
	select cpl.* 
	from  phone p, contact c, contactphonelinkage cpl, phone cp
	where p.owner = p_user
	and c.phone = p.id 
	and cpl.contact = c.id
	and cpl.phone_id = cp.id
	and ( ( p_name is not null and p_name = cpl.name ) 
		or    p_name is null )
	and ( ( p_intl = true and p_contact_phone =  cp.intl )
		or  ( p_intl = false and p_contact_phone = cp.number ) );

GET DIAGNOSTICS row_cnt = ROW_COUNT;

IF row_cnt = 0 THEN
  return 0; 
END IF;

IF p_all = true THEN
	delete from contactphonelinkage where contact in ( select contact from t_rc_contact);
	delete from contact where id in ( select contact from t_rc_contact);
	delete from contact_contact__phone_id  where contact_contact in ( select contact from t_rc_contact);
	return 1;
END IF;

delete from contactphonelinkage where id in ( select id from t_rc_contact);
delete from contact_contact__phone_id ccpi 
	using t_rc_contact trc 
where ccpi.contact_contact = trc.contact
and ccpi.phone_id = trc.phone_id;

return 1;

return array_to_json(array_agg(t_result)) from t_result;

END;
$$             
LANGUAGE 'plpgsql';
