CREATE OR REPLACE FUNCTION notify_contacts(p_user integer) 
RETURNS json AS
$$
BEGIN

DROP TABLE IF EXISTS t_own_contacts;
DROP TABLE IF EXISTS t_contacts_of_my_contacts;

-- user table here contains details of contacts

create temporary table t_own_contacts as 
  select u.reg_id, u.id
  from users u, phone p, contact c, contact_contact__phone_id ccpi, phone cp 
  where p.owner =  p_user
  and p.verified = true
  and cp.verified = true
  and c.phone = p.id 
  and ccpi.contact_contact = c.id  
  and ccpi.phone_id = cp.id 
  and cp.owner = u.id
  and u.reg_id is not null
  and u.id not in ( p_user, 1 ) ; -- excluding sayhellos team since another notification will be sent via add_hellos

-- t_own_contacts contains ids of all the contacts of p_user

create temporary table t_contacts_of_my_contacts as
  select toc.id
  from t_own_contacts toc, phone p, contact c, contact_contact__phone_id ccpi, phone cp 
  where p.owner =  toc.id
  and p.verified = true
  and cp.verified = true
  and c.phone = p.id 
  and ccpi.contact_contact = c.id  
  and ccpi.phone_id = cp.id 
  and cp.owner = p_user;

delete from t_own_contacts
  where id not in ( select id from t_contacts_of_my_contacts );

return array_to_json(array_agg(distinct reg_id)) from t_own_contacts;

-- t_contacts_of_my_contacts contains users who contains p_user in their contacts 

END;
$$             
LANGUAGE 'plpgsql';