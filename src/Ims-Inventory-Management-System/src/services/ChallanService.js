import { supabase } from '../supabaseClient';

export const getChallans = async () => {
  const { data, error } = await supabase
    .from('challan')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching challans:', error);
    throw error;
  }
  return data || [];
};

export const getChallanById = async (id) => {
  if (id === undefined || id === null || id === '') return null;
  const { data, error } = await supabase
    .from('challan')
    .select('*')
    .eq('id', String(id))
    .limit(1);

  if (error) {
    console.error('Error fetching challan by id:', error);
    return null;
  }
  return data && data.length ? data[0] : null;
};

export const createChallan = async (challanData) => {
  const { data, error } = await supabase
    .from('challan')
    .insert([challanData])
    .select()
    .single();

  if (error) {
    console.error('Error creating challan:', error);
    throw error;
  }
  return data;
};

export const updateChallan = async (id, updates) => {
  const { data, error } = await supabase
    .from('challan')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating challan:', error);
    throw error;
  }
  return data;
};

export const deleteChallan = async (id) => {
  const { error } = await supabase
    .from('challan')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting challan:', error);
    throw error;
  }
  return true;
};
