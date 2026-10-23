CREATE OR REPLACE PROCEDURE SMCFT.SP_REPORTE_CRUCES(
p_desde DATE, p_hasta DATE, p_usuario NUMBER, p_reporte OUT NUMBER) AS
BEGIN
SMCFT.PKG_GESTION_FRONTERA.sp_reporte_cruces_por_paso(p_desde,p_hasta,p_usuario,p_reporte);
END;
/
