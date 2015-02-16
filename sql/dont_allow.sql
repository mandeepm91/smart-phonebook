CREATE OR REPLACE FUNCTION dont_allow(p_self integer, p_user integer) 
RETURNS json AS
$$
BEGIN

DROP TABLE IF EXISTS t_da_contacts;

-- Remove self from contacts of user

create temporary table t_da_contacts as
	select distinct c.id as contact_id
	from phone p, contact c, contact_contact__phone_id ccpi, phone cp, users u
	where p.owner = p_user
	and c.phone = p.id
	and ccpi.contact_contact = c.id
	and ccpi.phone_id = cp.id
	and cp.owner = p_self;

delete from contact where id in ( select contact_id from t_da_contacts);
delete from contact_contact__phone_id where contact_contact in ( select contact_id from t_da_contacts);
delete from contactphonelinkage where contact in ( select contact_id from t_da_contacts);

RETURN row_to_json(users) from users where id = p_user;

END;
$$             
LANGUAGE 'plpgsql';

