'use client';

import { useEffect, useState } from 'react';
import { addAgentAction, deleteAgentAction, getAgentsAction, updateAgentAction } from '../actions';
import { createClient } from '../lib/supabaseClient';

export const EMPTY_FORM = {
  name: '',
  description: '',
  framework: 'Custom',
  public_metrics: false,
};

/**
 * auth/user state, loading agents, search/status filtering, and the
 * add/edit/delete CRUD flows
 */
export function useAgents() {
  const [agents, setAgents] = useState([]);
  const [user, setUser] = useState(null);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadUserAndAgents() {
      const supabase = createClient();

      // If the Supabase client couldn't be created (missing NEXT_PUBLIC_* env vars),
      // avoid calling methods on `null` which would crash the page.
      if (!supabase) {
        console.warn('Supabase client not available; missing NEXT_PUBLIC_SUPABASE_* env vars');
        setUser(null);
        setAgents([]);
        setSelectedId(null);
        return;
      }

      const { data: { user: currentUser } = {}, error: userError } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        setUser(null);
        setAgents([]);
        setSelectedId(null);
        return;
      }

      setUser(currentUser);

      try {
        const data = await getAgentsAction();
        setAgents(Array.isArray(data) ? data : []);
        setSelectedId((current) => current ?? data?.[0]?.id ?? null);
      } catch (err) {
        console.error('Unable to load agents from Supabase:', err);
        setAgents([]);
        setSelectedId(null);
      }
    }

    loadUserAndAgents();
  }, []);

  const filtered = agents.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !filterStatus || filterStatus === 'all'
      ? true
      : a.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const selectedAgent = agents.find((a) => a.id === selectedId) ?? null;

  const resetFormState = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setShowAddForm(false);
    setShowEditForm(false);
    setError('');
  };

  // Toggles the "Add Agent" modal from the hero button
  const openAddForm = () => {
    setShowAddForm((current) => !current);
    setShowEditForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setError('');
  };

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleAddAgent = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const newAgent = await addAgentAction(formData);
      setAgents((current) => [newAgent, ...current]);
      setSelectedId(newAgent.id);
      resetFormState();
    } catch (err) {
      setError(err.message || 'Could not add agent.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAgent = (agent) => {
    setEditingId(agent.id);
    setFormData({
      name: agent.name ?? '',
      description: agent.description ?? '',
      framework: agent.framework ?? 'Custom',
      public_metrics: Boolean(agent.public_metrics),
    });
    setError('');
    setShowAddForm(false);
    setShowEditForm(true);
  };

  const handleUpdateAgent = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const updatedAgent = await updateAgentAction(editingId, formData);
      setAgents((current) => current.map((agent) => (
        agent.id === editingId ? updatedAgent : agent
      )));
      setSelectedId(editingId);
      resetFormState();
    } catch (err) {
      setError(err.message || 'Could not update agent.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAgent = async () => {
    if (!selectedAgent) {
      return;
    }

    const confirmed = window.confirm(`Delete "${selectedAgent.name}"? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setError('');
    setIsDeleting(true);

    try {
      await deleteAgentAction(selectedAgent.id);
      const remainingAgents = agents.filter((agent) => agent.id !== selectedAgent.id);
      setAgents(remainingAgents);
      setSelectedId(remainingAgents[0]?.id ?? null);
    } catch (err) {
      setError(err.message || 'Could not delete agent.');
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    // data
    agents,
    filtered,
    selectedAgent,
    user,
    // filters / selection
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    selectedId,
    setSelectedId,
    // add/edit modal state
    showAddForm,
    showEditForm,
    formData,
    isSubmitting,
    isDeleting,
    error,
    // actions
    openAddForm,
    resetFormState,
    handleInputChange,
    handleAddAgent,
    handleUpdateAgent,
    handleDeleteAgent,
    handleEditAgent,
  };
}