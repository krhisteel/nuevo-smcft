-- =====================================================================
-- SMCFT - Credenciales de acceso para la página web
-- Ejecutar en SQL Developer conectado como SMCFT, DESPUÉS de 03_datos_prueba.sql.
--
-- La carga de datos deja a todos los usuarios con PASSWORD_HASH =
-- 'SIN_CREDENCIAL_DE_ACCESO', por lo que nadie puede iniciar sesión en la web.
-- Este script asigna contraseñas (cifradas con bcrypt) a un usuario de cada rol.
-- No modifica tablas, package ni triggers.
-- =====================================================================
SET DEFINE OFF

-- ADMINISTRADOR: camila.soto@example.com / admin123
UPDATE SMCFT.USUARIO SET PASSWORD_HASH = '$2a$10$upHGi1YLuM5vQTyJcVXSzuYKIvLyZaOYoDJfP3sbOKTfFzQNP1vhe'
WHERE EMAIL = 'camila.soto@example.com';
-- FISCALIZADOR: diego.munoz@example.com / fiscal123
UPDATE SMCFT.USUARIO SET PASSWORD_HASH = '$2a$10$QkfNtWDouCqit51qpCrVa.NOJ1DDUEKaT76pegSH5SJ3LxO6xbmUW'
WHERE EMAIL = 'diego.munoz@example.com';
-- INSPECTOR_SAG: valentina.gonzalez@example.com / sag123
UPDATE SMCFT.USUARIO SET PASSWORD_HASH = '$2a$10$YogAankDmcGWgUVhIE7LrOTgVjrAwVNW5Sqcrmn4FlIA1X8qiLaCe'
WHERE EMAIL = 'valentina.gonzalez@example.com';
-- AUDITOR: matias.rojas@example.com / auditor123
UPDATE SMCFT.USUARIO SET PASSWORD_HASH = '$2a$10$mx7Qb0R1PD2rwvzrfn.nI.Er.5tEADrrd50MfCOUCQEgmVtD0OBDG'
WHERE EMAIL = 'matias.rojas@example.com';
-- VIAJERO: isidora.perez@example.com / viajero123
UPDATE SMCFT.USUARIO SET PASSWORD_HASH = '$2a$10$Re2nh9WC7yVzT8scAkmhruGjtTnevO4cNzBv9Cd8bsS2U8N5GeDCW'
WHERE EMAIL = 'isidora.perez@example.com';

COMMIT;

SELECT u.EMAIL, r.NOMBRE_ROL,
       CASE WHEN u.PASSWORD_HASH LIKE '$2%' THEN 'SI' ELSE 'NO' END AS PUEDE_INGRESAR_WEB
FROM SMCFT.USUARIO u
JOIN SMCFT.USUARIO_ROL ur ON ur.ID_USUARIO = u.ID_USUARIO AND ur.ACTIVO = 'S'
JOIN SMCFT.ROL r ON r.ID_ROL = ur.ID_ROL
WHERE u.PASSWORD_HASH LIKE '$2%'
ORDER BY r.NOMBRE_ROL;
