CREATE OR REPLACE FUNCTION find_unknown(p_contacts json) 
RETURNS json AS
$$
BEGIN

DROP TABLE IF EXISTS t_contacts;
DROP TABLE IF EXISTS t_results;

create temporary table t_contacts as
select replace(cast(json_array_elements(p_contacts) as text),'"','') as contact;

create temporary table t_results as
select u.twitter, u.handle, p.intl 
from users u, phone p
where p.owner = u.id
and p.verified = true
and p.intl in  ( select contact from t_contacts);

RETURN array_to_json(array_agg(t_results)) FROM t_results;

END;
$$             
LANGUAGE 'plpgsql';

