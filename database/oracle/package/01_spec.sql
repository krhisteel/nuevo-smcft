CREATE OR REPLACE PACKAGE SMCFT.PKG_GESTION_FRONTERA AS
TYPE t_detalle_cruce IS RECORD (
id_cruce SMCFT.CRUCE_FRONTERIZO.ID_CRUCE%TYPE,
nombre_paso SMCFT.PASO_FRONTERIZO.NOMBRE%TYPE,
tipo_movimiento SMCFT.CRUCE_FRONTERIZO.TIPO_MOVIMIENTO%TYPE,
fecha_hora SMCFT.CRUCE_FRONTERIZO.FECHA_HORA%TYPE,
cant_viajeros NUMBER,
valor_declarado NUMBER
);
TYPE t_item_resumen IS RECORD (
descripcion SMCFT.ITEM_DECLARADO.DESCRIPCION%TYPE,
cantidad SMCFT.ITEM_DECLARADO.CANTIDAD%TYPE,
valor_usd SMCFT.ITEM_DECLARADO.VALOR_USD%TYPE
);
TYPE t_items_varray IS VARRAY(50) OF t_item_resumen;
TYPE t_ruts_varray IS VARRAY(10) OF SMCFT.PERSONA.RUT%TYPE;
TYPE t_plazo_info IS RECORD (
id_plazo SMCFT.PLAZO_ADMISION.ID_PLAZO%TYPE,
patente SMCFT.VEHICULO.PATENTE%TYPE,
fecha_limite SMCFT.PLAZO_ADMISION.FECHA_LIMITE%TYPE,
dias_restantes NUMBER
);
exc_plazo_vencido EXCEPTION;
exc_menor_sin_autorizacion EXCEPTION;
exc_documento_vencido EXCEPTION;
exc_vehiculo_no_encontrado EXCEPTION;
PRAGMA EXCEPTION_INIT(exc_plazo_vencido, -20001);
PRAGMA EXCEPTION_INIT(exc_menor_sin_autorizacion, -20002);
PRAGMA EXCEPTION_INIT(exc_documento_vencido, -20003);
PRAGMA EXCEPTION_INIT(exc_vehiculo_no_encontrado, -20004);
PROCEDURE sp_registrar_cruce(
p_id_paso IN NUMBER,
p_patente IN VARCHAR2, -- NULL si el cruce es peatonal
p_tipo_movimiento IN VARCHAR2, -- 'ENTRADA' / 'SALIDA'
p_ruts_viajeros IN t_ruts_varray,
p_rut_conductor IN VARCHAR2 DEFAULT NULL,
p_id_cruce_out OUT NUMBER
);
PROCEDURE sp_reporte_cruces_por_paso(
p_fecha_desde IN DATE,
p_fecha_hasta IN DATE,
p_id_usuario_generador IN NUMBER,
p_id_reporte_out OUT NUMBER
);
FUNCTION fn_dias_restantes_plazo(p_id_plazo IN NUMBER) RETURN NUMBER;
FUNCTION fn_valor_total_declarado(p_id_cruce IN NUMBER) RETURN NUMBER;
PROCEDURE sp_actualizar_plazos_vencidos;
FUNCTION fn_total_plazos_vencidos RETURN NUMBER;
END PKG_GESTION_FRONTERA;
/
