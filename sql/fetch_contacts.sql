CREATE OR REPLACE FUNCTION fetch_contacts(p_user integer) 
RETURNS json AS
$$
BEGIN

DROP TABLE IF EXISTS t_fc_result;
-- DROP TABLE IF exists t_contacts;

-- create temp table t_contacts as
-- select distinct c.id as contact_id 
-- from phone p, contact c
-- where p.owner = p_user
-- and p.verified = true
-- and p.id = c.phone;

-- create temp table t_result as
-- select cpl."contactId"
-- , cpl.name as contact_name
-- , p.number
-- , p.intl
-- , u.handle
-- , u.name
-- , u.primary_email
-- from contactphonelinkage cpl
-- inner join phone p on cpl.phone_id = p.id and p.verified = true
-- inner join t_contacts c on cpl.contact = c.contact_id
-- left outer join users u on p.owner = u.id;
create temporary table t_fc_result as
select distinct u.id, u.name, u.handle, u.reg_id, c.id as contact, p.intl as user_phone, cp.intl as contact_phone
from phone p, contact c, contact_contact__phone_id ccpi, phone cp, users u
where p.owner = p_user
and c.phone = p.id
and ccpi.contact_contact = c.id
and cp.id = ccpi.phone_id
and u.id = cp.owner;

RETURN json_agg(t_fc_result) FROM t_fc_result;

END;
$$             
LANGUAGE 'plpgsql';

