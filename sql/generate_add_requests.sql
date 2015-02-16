CREATE OR REPLACE FUNCTION generate_add_requests(p_user integer) 
RETURNS json AS
$$
BEGIN

DROP TABLE IF EXISTS t_my_outdegree;
DROP TABLE IF EXISTS t_my_indegree;

-- This proc aims to find the users who have p_user in their contacts
-- but p_user does not have them in his contacts

create temporary table t_my_indegree as
  select distinct u.id
  from phone cp, contact c, contact_contact__phone_id ccpi, phone p, users u
  where cp.owner = p_user
  and p.verified = true
  and cp.verified = true
  and ccpi.phone_id = cp.id
  and ccpi.contact_contact = c.id
  and c.phone = p.id
  and p.owner = u.id
  and u.id <>  p_user
  and u.reg_id is not null;


create temporary table t_my_outdegree as
  select distinct u.id
  from phone p, contact c, contact_contact__phone_id ccpi, phone cp, users u
  where p.owner = p_user
  and p.verified = true
  and cp.verified = true
  and c.phone = p.id
  and ccpi.contact_contact = c.id
  and cp.id = ccpi.phone_id
  and cp.owner = u.id
  and u.id <> p_user
  and u.reg_id is not null;

delete from t_my_indegree where id in ( select id from t_my_outdegree );

return array_to_json(array_agg(t_my_indegree)) from t_my_indegree;


END;
$$             
LANGUAGE 'plpgsql';

