

insert into phone (iso, isd, number, imei, intl, owner, verified, id, "createdAt", "updatedAt")
	values ('IN', 91, '9899424647', '122131221312213', '+91 98 99 424647', 1, true, 1, now()::timestamp(0) with time zone, now()::timestamp(0) with time zone );

insert into email (email, owner, verified, id)
	values ('manik@hellos.co', 1, true, 1);

insert into users (id, handle, name, permission, twitter, primary_email, primary_phone, last, active, "createdAt", "updatedAt", dp)
	values (1, 'sayhellos', 'Hellos Team', 3, false, 1, 1, now()::timestamp(0) with time zone, true, now()::timestamp(0) with time zone, now()::timestamp(0) with time zone, 'http://ec2-54-187-202-163.us-west-2.compute.amazonaws.com:1337/api/user/dp?url=/home/ubuntu/vault/user/hellos_team.png');

insert into phone_id__user_phone (id, user_phone, phone_id)
	values (1,1,1);

insert into email_id__user_email (id, user_email, email_id)
	values (1,1,1);	