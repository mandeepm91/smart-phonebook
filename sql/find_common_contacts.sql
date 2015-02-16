CREATE OR REPLACE FUNCTION find_common_contacts(p_user1 integer, p_user2 integer) 
RETURNS json AS
$$
DECLARE

BEGIN

DROP TABLE IF EXISTS t_user1_contacts;
DROP TABLE IF EXISTS t_user2_contacts;

create temporary table t_user1_contacts AS
  select distinct u.id , u.handle, u.name
  from phone p, contact c, contact_contact__phone_id ccpi , phone cp, users u
  where p.owner = p_user1
  and p.verified = true
  and c.phone = p.id
  and ccpi.contact_contact = c.id
  and cp.id = ccpi.phone_id
  and cp.owner = u.id
  and cp.verified = true
  and u.id not in (p_user1, 1) ;

create temporary table t_user2_contacts AS
  select distinct u.id , u.handle, u.name
  from phone p, contact c, contact_contact__phone_id ccpi , phone cp, users u
  where p.owner = p_user2
  and p.verified = true
  and c.phone = p.id
  and ccpi.contact_contact = c.id
  and cp.id = ccpi.phone_id
  and cp.owner = u.id
  and cp.verified = true
  and u.id not in (p_user2, 1);


return json_agg(distinct t1.name)
from t_user1_contacts t1, t_user2_contacts t2
where t1.id = t2.id;

END;
$$             
LANGUAGE 'plpgsql';
