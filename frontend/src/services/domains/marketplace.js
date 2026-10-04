/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { api } from '../http/client';

export const manageRequestAPI = {
  send:    (data)            => api.post  ('/manage-request/send/', data),
  sent:    (params)          => api.get   ('/manage-request/sent/', { params }),
  cancel:  (id)              => api.delete(`/manage-request/${id}/`),
  // Public fetch (no auth required server-side, but interceptor still attaches token if present)
  invite:  (token)           => api.get   (`/manage-invite/${token}/`),
  accept:  (token, payload)  => api.post  (`/manage-invite/${token}/accept/`,  payload || {}),
  decline: (token, payload)  => api.post  (`/manage-invite/${token}/decline/`, payload || {}),
};

export const relationAPI = {
  list:           ()             => api.get(`/relations/`),
  get:            (id)           => api.get(`/relations/${id}/`),
  updatePerms:    (id, payload)  => api.put(`/relations/${id}/permissions/`, payload),
  pause:          (id)           => api.post(`/relations/${id}/pause/`,     {}),
  resume:         (id)           => api.post(`/relations/${id}/resume/`,    {}),
  terminate:      (id, reason)   => api.post(`/relations/${id}/terminate/`, { reason }),
  flag:           (id, reason)   => api.post(`/relations/${id}/flag/`,      { reason }),
  agencyProfile:  (id)           => api.get(`/relations/${id}/agency-profile/`),
};

export const managementAPI = {
  // Staff
  listStaff:           ()           => api.get('/management/staff/'),
  createStaff:         (data)       => api.post('/management/staff/', data),
  getStaff:            (id)         => api.get(`/management/staff/${id}/`),
  updateStaff:         (id, data)   => api.patch(`/management/staff/${id}/`, data),
  deleteStaff:         (id)         => api.delete(`/management/staff/${id}/`),
  getStaffPermissions: (id)         => api.get(`/management/staff/${id}/permissions/`),
  setStaffPermissions: (id, data)   => api.post(`/management/staff/${id}/permissions/`, data),
  getStaffWorkspaces:     (id)         => api.get(`/management/staff/${id}/workspaces/`),
  setStaffWorkspaces:     (id, data)   => api.post(`/management/staff/${id}/workspaces/`, data),
  // Clients
  listWorkspaces:               ()           => api.get('/management/workspaces/'),
  getWorkspace:                 (id)         => api.get(`/management/workspaces/${id}/`),
  updateWorkspace:              (id, data)   => api.patch(`/management/workspaces/${id}/`, data),
  getWorkspacePermissions:      (id)         => api.get(`/management/workspaces/${id}/permissions/`),
  setWorkspacePermissions:      (id, data)   => api.post(`/management/workspaces/${id}/permissions/`, data),
  getWorkspacePortalConfig:     (id)         => api.get(`/management/workspaces/${id}/portal-config/`),
  saveWorkspacePortalConfig:    (id, data)   => api.put(`/management/workspaces/${id}/portal-config/`, data),
  // Permissions & Roles
  listPermissions:     ()           => api.get('/management/permissions/'),
  getRoleDefaults:     (role)       => api.get(`/management/role-defaults/${role}/`),
  setRoleDefaults:     (role, data) => api.put(`/management/role-defaults/${role}/`, data),
};

// Retained Client SDK compatibility; new code uses workspace names.
managementAPI.getStaffClients = managementAPI.getStaffWorkspaces;
managementAPI.setStaffClients = managementAPI.setStaffWorkspaces;
managementAPI.listClients = managementAPI.listWorkspaces;
managementAPI.getClient = managementAPI.getWorkspace;
managementAPI.updateClient = managementAPI.updateWorkspace;
managementAPI.getClientPermissions = managementAPI.getWorkspacePermissions;
managementAPI.setClientPermissions = managementAPI.setWorkspacePermissions;
managementAPI.getClientPortalConfig = managementAPI.getWorkspacePortalConfig;
managementAPI.saveClientPortalConfig = managementAPI.saveWorkspacePortalConfig;
