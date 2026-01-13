import type { StorageShape, Contact, Opportunity, Task } from '../types/schema';

const STORAGE_KEY = 'close_data';


export const getStorageData = async (): Promise<StorageShape> => {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  
  return (result[STORAGE_KEY] as StorageShape) || { 
    contacts: {}, 
    opportunities: {}, 
    tasks: {}, 
    lastSync: 0 
  };
};

export const saveExtractedData = async (
  newContacts: Contact[],
  newOpps: Opportunity[],
  newTasks: Task[]
) => {
  const current = await getStorageData();

  const contactMap = { ...current.contacts };
  const oppMap = { ...current.opportunities };
  const taskMap = { ...current.tasks };

  newContacts.forEach(c => contactMap[c.id] = c);
  newOpps.forEach(o => oppMap[o.id] = o);
  newTasks.forEach(t => taskMap[t.id] = t);

  
  const updatedData: StorageShape = {
    contacts: contactMap,
    opportunities: oppMap,
    tasks: taskMap,
    lastSync: Date.now(),
  };

  await chrome.storage.local.set({ [STORAGE_KEY]: updatedData });
  console.log("Data Saved Successfully", updatedData);
};


export const clearData = async () => {
  await chrome.storage.local.remove(STORAGE_KEY);
};