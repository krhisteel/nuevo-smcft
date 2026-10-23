CREATE OR REPLACE PACKAGE BODY SMCFT.PKG_GESTION_FRONTERA AS
PROCEDURE validar_rango(p_desde DATE, p_hasta DATE) IS
BEGIN
IF p_desde IS NULL OR p_hasta IS NULL OR p_desde > p_hasta THEN
RAISE_APPLICATION_ERROR(-20020, 'Rango de fechas invalido.');
END IF;
END validar_rango;
FUNCTION fn_valor_total_declarado(p_id_cruce IN NUMBER) RETURN NUMBER IS
CURSOR c_items(p_cruce NUMBER) IS
SELECT i.VALOR_USD
FROM SMCFT.ITEM_DECLARADO i
JOIN SMCFT.DECLARACION d ON d.ID_DECLARACION = i.ID_DECLARACION
WHERE d.ID_CRUCE = p_cruce;
v_total NUMBER := 0;
BEGIN
FOR r_item IN c_items(p_id_cruce) LOOP
v_total := v_total + NVL(r_item.VALOR_USD, 0);
END LOOP;
RETURN v_total;
EXCEPTION
WHEN NO_DATA_FOUND THEN
RETURN 0;
END fn_valor_total_declarado;
FUNCTION fn_dias_restantes_plazo(p_id_plazo IN NUMBER) RETURN NUMBER IS
v_fecha_limite SMCFT.PLAZO_ADMISION.FECHA_LIMITE%TYPE;
v_dias NUMBER;
BEGIN
SELECT FECHA_LIMITE
INTO v_fecha_limite
FROM SMCFT.PLAZO_ADMISION
WHERE ID_PLAZO = p_id_plazo;
v_dias := TRUNC(v_fecha_limite) - TRUNC(SYSDATE);
IF v_dias < 0 THEN
RAISE exc_plazo_vencido;
END IF;
RETURN v_dias;
EXCEPTION
WHEN NO_DATA_FOUND THEN
RAISE_APPLICATION_ERROR(-20006,
'No existe el plazo de admision indicado (ID_PLAZO=' || p_id_plazo || ').');
WHEN exc_plazo_vencido THEN
RAISE_APPLICATION_ERROR(-20001,
'El plazo de admision ID_PLAZO=' || p_id_plazo || ' se encuentra VENCIDO (dias='
|| v_dias || ').');
END fn_dias_restantes_plazo;
PROCEDURE sp_registrar_cruce(
p_id_paso IN NUMBER,
p_patente IN VARCHAR2,
p_tipo_movimiento IN VARCHAR2,
p_ruts_viajeros IN t_ruts_varray,
p_rut_conductor IN VARCHAR2 DEFAULT NULL,
p_id_cruce_out OUT NUMBER
) IS
v_id_vehiculo SMCFT.VEHICULO.ID_VEHICULO%TYPE;
v_id_persona SMCFT.PERSONA.ID_PERSONA%TYPE;
v_fecha_nac SMCFT.PERSONA.FECHA_NACIMIENTO%TYPE;
v_edad NUMBER;
v_cnt_autoriz NUMBER;
v_rol VARCHAR2(20);
v_rut_actual SMCFT.PERSONA.RUT%TYPE;
BEGIN
SAVEPOINT operacion_cruce;
IF p_tipo_movimiento IS NULL OR p_tipo_movimiento NOT IN ('ENTRADA','SALIDA') THEN
RAISE_APPLICATION_ERROR(-20021, 'Movimiento invalido.');
END IF;
IF p_ruts_viajeros IS NULL THEN
RAISE_APPLICATION_ERROR(-20022, 'Debe informar viajeros.');
END IF;
IF p_ruts_viajeros.COUNT = 0 THEN
RAISE_APPLICATION_ERROR(-20022, 'Debe informar viajeros.');
END IF;
IF p_patente IS NOT NULL THEN
BEGIN
SELECT ID_VEHICULO INTO v_id_vehiculo
FROM SMCFT.VEHICULO
WHERE PATENTE = p_patente;
EXCEPTION
WHEN NO_DATA_FOUND THEN
RAISE exc_vehiculo_no_encontrado;
END;
ELSE
v_id_vehiculo := NULL;
END IF;
INSERT INTO SMCFT.CRUCE_FRONTERIZO (
ID_CRUCE, ID_PASO, ID_VEHICULO, TIPO_MOVIMIENTO, FECHA_HORA, ESTADO
) VALUES (
SMCFT.SEQ_CRUCE.NEXTVAL, p_id_paso, v_id_vehiculo, p_tipo_movimiento, SYSTIMESTAMP,
'AUTORIZADO'
) RETURNING ID_CRUCE INTO p_id_cruce_out;
IF p_ruts_viajeros IS NOT NULL THEN
FOR i IN 1 .. p_ruts_viajeros.COUNT LOOP
v_rut_actual := p_ruts_viajeros(i);
BEGIN
SELECT ID_PERSONA, FECHA_NACIMIENTO
INTO v_id_persona, v_fecha_nac
FROM SMCFT.PERSONA
WHERE RUT = v_rut_actual;
EXCEPTION
WHEN NO_DATA_FOUND THEN
RAISE_APPLICATION_ERROR(-20010,
'No existe una persona registrada con RUT ' || v_rut_actual || '.');
END;
v_edad := TRUNC(MONTHS_BETWEEN(SYSDATE, v_fecha_nac) / 12);
IF v_edad < 18 THEN
SELECT COUNT(*) INTO v_cnt_autoriz
FROM SMCFT.AUTORIZACION_MENOR
WHERE ID_MENOR = v_id_persona
AND ESTADO = 'VIGENTE';
IF v_cnt_autoriz = 0 THEN
RAISE exc_menor_sin_autorizacion;
END IF;
END IF;
v_rol := CASE WHEN v_rut_actual = p_rut_conductor
THEN 'CONDUCTOR' ELSE 'ACOMPANANTE' END;
INSERT INTO SMCFT.DETALLE_CRUCE_PERSONA (ID_CRUCE, ID_PERSONA, ROL_VIAJERO)
VALUES (p_id_cruce_out, v_id_persona, v_rol);
END LOOP;
END IF;
EXCEPTION
WHEN exc_vehiculo_no_encontrado THEN
ROLLBACK TO operacion_cruce;
RAISE_APPLICATION_ERROR(-20004,
'No existe un vehiculo registrado con patente ' || p_patente || '.');
WHEN exc_menor_sin_autorizacion THEN
ROLLBACK TO operacion_cruce;
RAISE_APPLICATION_ERROR(-20002,
'El viajero con RUT ' || v_rut_actual ||
' es menor de edad y no cuenta con autorizacion vigente para cruzar.');
WHEN OTHERS THEN
ROLLBACK TO operacion_cruce;
RAISE;
END sp_registrar_cruce;
PROCEDURE sp_reporte_cruces_por_paso(
p_fecha_desde IN DATE,
p_fecha_hasta IN DATE,
p_id_usuario_generador IN NUMBER,
p_id_reporte_out OUT NUMBER
) IS
CURSOR c_pasos IS
SELECT ID_PASO, NOMBRE
FROM SMCFT.PASO_FRONTERIZO
WHERE ESTADO = 'ACTIVO'
ORDER BY NOMBRE;
CURSOR c_cruces_paso(p_paso NUMBER, p_desde DATE, p_hasta DATE) IS
SELECT ID_CRUCE, TIPO_MOVIMIENTO, FECHA_HORA
FROM SMCFT.CRUCE_FRONTERIZO
WHERE ID_PASO = p_paso
AND FECHA_HORA BETWEEN p_desde AND p_hasta
ORDER BY FECHA_HORA;
CURSOR c_viajeros_cruce(p_cruce NUMBER) IS
SELECT ID_PERSONA
FROM SMCFT.DETALLE_CRUCE_PERSONA
WHERE ID_CRUCE = p_cruce;
v_id_persona_dummy SMCFT.PERSONA.ID_PERSONA%TYPE;
v_total_cruces_paso NUMBER;
v_total_viajeros_paso NUMBER;
v_total_valor_paso NUMBER;
v_cant_viajeros_cruce NUMBER;
v_valor_cruce NUMBER;
BEGIN
SAVEPOINT operacion_reporte;
validar_rango(p_fecha_desde, p_fecha_hasta);
INSERT INTO SMCFT.REPORTE (
ID_REPORTE, TITULO, TIPO_REPORTE, FECHA_INICIO, FECHA_FIN,
ID_USUARIO_GENERADOR, ESTADO, OBSERVACIONES
) VALUES (
SMCFT.SEQ_REPORTE.NEXTVAL,
'Cruces por paso fronterizo ' || TO_CHAR(p_fecha_desde,'DD-MM-YYYY')
|| ' a ' || TO_CHAR(p_fecha_hasta,'DD-MM-YYYY'),
'CRUCES', p_fecha_desde, p_fecha_hasta,
p_id_usuario_generador, 'EN_PROCESO', NULL
) RETURNING ID_REPORTE INTO p_id_reporte_out;
FOR r_paso IN c_pasos LOOP
v_total_cruces_paso := 0;
v_total_viajeros_paso := 0;
v_total_valor_paso := 0;
FOR r_cruce IN c_cruces_paso(r_paso.ID_PASO, p_fecha_desde, p_fecha_hasta) LOOP
v_total_cruces_paso := v_total_cruces_paso + 1;
v_cant_viajeros_cruce := 0;
OPEN c_viajeros_cruce(r_cruce.ID_CRUCE);
LOOP
FETCH c_viajeros_cruce INTO v_id_persona_dummy;
EXIT WHEN c_viajeros_cruce%NOTFOUND;
v_cant_viajeros_cruce := v_cant_viajeros_cruce + 1;
END LOOP;
CLOSE c_viajeros_cruce;
v_total_viajeros_paso := v_total_viajeros_paso + v_cant_viajeros_cruce;
v_valor_cruce := fn_valor_total_declarado(r_cruce.ID_CRUCE);
v_total_valor_paso := v_total_valor_paso + NVL(v_valor_cruce, 0);
END LOOP; -- c_cruces_paso
INSERT INTO SMCFT.REPORTE_DETALLE (ID_DETALLE, ID_REPORTE, DESCRIPCION, VALOR, UNIDAD,
CATEGORIA)
VALUES (SMCFT.SEQ_REPORTE_DET.NEXTVAL, p_id_reporte_out,
'Cruces registrados en ' || r_paso.NOMBRE, v_total_cruces_paso, 'cruces',
'CRUCES_POR_PASO');
INSERT INTO SMCFT.REPORTE_DETALLE (ID_DETALLE, ID_REPORTE, DESCRIPCION, VALOR, UNIDAD,
CATEGORIA)
VALUES (SMCFT.SEQ_REPORTE_DET.NEXTVAL, p_id_reporte_out,
'Viajeros registrados en ' || r_paso.NOMBRE, v_total_viajeros_paso, 'personas',
'VIAJEROS_POR_PASO');
INSERT INTO SMCFT.REPORTE_DETALLE (ID_DETALLE, ID_REPORTE, DESCRIPCION, VALOR, UNIDAD,
CATEGORIA)
VALUES (SMCFT.SEQ_REPORTE_DET.NEXTVAL, p_id_reporte_out,
'Valor USD declarado en ' || r_paso.NOMBRE, v_total_valor_paso, 'USD',
'VALOR_DECLARADO_POR_PASO');
END LOOP; -- c_pasos
UPDATE SMCFT.REPORTE SET ESTADO = 'GENERADO' WHERE ID_REPORTE = p_id_reporte_out;
EXCEPTION
WHEN NO_DATA_FOUND THEN
ROLLBACK TO operacion_reporte;
RAISE_APPLICATION_ERROR(-20005,
'No fue posible generar el reporte: no existen pasos fronterizos activos.');
WHEN OTHERS THEN
ROLLBACK TO operacion_reporte;
RAISE;
END sp_reporte_cruces_por_paso;
PROCEDURE sp_actualizar_plazos_vencidos IS
BEGIN
UPDATE SMCFT.PLAZO_ADMISION SET ESTADO = 'VENCIDO'
WHERE ESTADO = 'ACTIVO' AND FECHA_LIMITE < CAST(TRUNC(SYSDATE) AS TIMESTAMP);
DBMS_OUTPUT.PUT_LINE('Plazos actualizados: ' || SQL%ROWCOUNT);
END;
FUNCTION fn_total_plazos_vencidos RETURN NUMBER IS
v_total NUMBER;
BEGIN
SELECT COUNT(*) INTO v_total FROM SMCFT.PLAZO_ADMISION
WHERE ESTADO <> 'CERRADO' AND FECHA_LIMITE < CAST(TRUNC(SYSDATE) AS TIMESTAMP);
RETURN v_total;
END;
END PKG_GESTION_FRONTERA;
/
