import api from './axios'

const service = (base) => ({
  list: (params) => api.get(`/${base}`, { params }).then(r => r.data),
  getById: (id) => api.get(`/${base}/${id}`).then(r => r.data),
  create: (data) => api.post(`/${base}`, data).then(r => r.data),
  update: (id, data) => api.put(`/${base}/${id}`, data).then(r => r.data),
  patch: (id, data) => api.patch(`/${base}/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/${base}/${id}`).then(r => r.data),
})

export const userService = {
  ...service('users'),
  listActive: () => api.get('/users/activos').then(r => r.data),
  getByEmail: (email) => api.get(`/users/email/${email}`).then(r => r.data),
  getByRut: (rut) => api.get(`/users/rut/${rut}`).then(r => r.data),
  search: (nombre) => api.get(`/users/buscar?nombre=${nombre}`).then(r => r.data),
}

export const vehicleService = {
  ...service('vehicles'),
  getByPatente: (patente) => api.get(`/vehicles/patente/${patente}`).then(r => r.data),
  updateEstado: (patente, estado) => api.patch(`/vehicles/patente/${patente}/estado?nuevoEstado=${estado}`).then(r => r.data),
  getByPropietario: (rut) => api.get(`/vehicles/propietario/${rut}`).then(r => r.data),
  search: (marca) => api.get(`/vehicles/buscar?marca=${marca}`).then(r => r.data),
  documents: {
    list: (vehicleId) => api.get(`/vehicles/documentos/vehiculo/${vehicleId}`).then(r => r.data),
    create: (data) => api.post('/vehicles/documentos', data).then(r => r.data),
    invalidate: (id) => api.patch(`/vehicles/documentos/${id}/invalidar`).then(r => r.data),
  }
}

export const entryService = {
  ...service('entries'),
  getByPatente: (patente) => api.get(`/entries/patente/${patente}`).then(r => r.data),
  getByConductor: (rut) => api.get(`/entries/conductor/${rut}`).then(r => r.data),
  authorize: (id, rutFiscalizador, observaciones) =>
    api.patch(`/entries/${id}/autorizar?rutFiscalizador=${rutFiscalizador}&observaciones=${observaciones || ''}`).then(r => r.data),
  reject: (id, rutFiscalizador, observaciones) =>
    api.patch(`/entries/${id}/rechazar?rutFiscalizador=${rutFiscalizador}&observaciones=${observaciones || ''}`).then(r => r.data),
  items: {
    list: (entryId) => api.get(`/entries/items/ingreso/${entryId}`).then(r => r.data),
    create: (data) => api.post('/entries/items', data).then(r => r.data),
    approve: (id) => api.patch(`/entries/items/${id}/aprobar`).then(r => r.data),
    reject: (id) => api.patch(`/entries/items/${id}/rechazar`).then(r => r.data),
  }
}

export const crossingService = {
  ...service('border-crossings'),
  getByPatente: (patente) => api.get(`/border-crossings/patente/${patente}`).then(r => r.data),
  getByConductor: (rut) => api.get(`/border-crossings/conductor/${rut}`).then(r => r.data),
  authorize: (id, rutFiscalizador, observaciones) =>
    api.patch(`/border-crossings/${id}/autorizar?rutFiscalizador=${rutFiscalizador}&observaciones=${observaciones || ''}`).then(r => r.data),
  reject: (id, rutFiscalizador, observaciones) =>
    api.patch(`/border-crossings/${id}/rechazar?rutFiscalizador=${rutFiscalizador}&observaciones=${observaciones || ''}`).then(r => r.data),
  items: {
    list: (crossingId) => api.get(`/border-crossings/items/cruce/${crossingId}`).then(r => r.data),
    create: (data) => api.post('/border-crossings/items', data).then(r => r.data),
  }
}

export const transactionService = {
  ...service('transactions'),
  getByUser: (rut) => api.get(`/transactions/usuario/${rut}`).then(r => r.data),
  complete: (id) => api.patch(`/transactions/${id}/completar`).then(r => r.data),
  reject: (id) => api.patch(`/transactions/${id}/rechazar`).then(r => r.data),
  cancel: (id) => api.patch(`/transactions/${id}/anular`).then(r => r.data),
}

export const auditService = {
  ...service('audits'),
  getByAuditor: (rut) => api.get(`/audits/auditor/${rut}`).then(r => r.data),
}

export const reportService = {
  ...service('reports'),
  complete: (id) => api.patch(`/reports/${id}/completar`).then(r => r.data),
}

export const sanitaryService = {
  ...service('sanitary'),
  getByPatente: (patente) => api.get(`/sanitary/patente/${patente}`).then(r => r.data),
  approve: (id, observaciones) =>
    api.patch(`/sanitary/${id}/aprobar?observaciones=${observaciones || ''}`).then(r => r.data),
  reject: (id, observaciones) =>
    api.patch(`/sanitary/${id}/rechazar?observaciones=${observaciones || ''}`).then(r => r.data),
  items: {
    list: (inspectionId) => api.get(`/sanitary/items/inspeccion/${inspectionId}`).then(r => r.data),
    create: (data) => api.post('/sanitary/items', data).then(r => r.data),
  }
}

export const notificationService = {
  ...service('notifications'),
  getPending: () => api.get('/notifications/pendientes').then(r => r.data),
  markSent: (id) => api.patch(`/notifications/${id}/enviada`).then(r => r.data),
}

export const notificationRecipientService = {
  getByRut: (rut) => api.get(`/notification-recipients/destinatario/${rut}`).then(r => r.data),
  getUnreadByRut: (rut) => api.get(`/notification-recipients/destinatario/${rut}/no-leidas`).then(r => r.data),
  getUnreadCountByRut: (rut) => api.get(`/notification-recipients/estadisticas/destinatario/${rut}`).then(r => r.data?.total || 0),
  markAsRead: (id) => api.patch(`/notification-recipients/${id}/leida`).then(r => r.data),
}
