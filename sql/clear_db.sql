CREATE OR REPLACE FUNCTION clear_db() 
RETURNS integer AS
$$
BEGIN

delete from phone where owner <> 1 or owner is null;
delete from users where id <> 1 or id is null;
delete from contact;
delete from contact_contact__phone_id where phone_id <> 1;
delete from contactphonelinkage;
delete from email where id <> 1 or id is null;
delete from email_id__user_email where user_email <> 1;
delete from log;
delete from notification;
delete from phone_id__user_phone where user_phone <> 1;
delete from request;
delete from requestemail;

RETURN 1; 

END;
$$             
LANGUAGE 'plpgsql';

