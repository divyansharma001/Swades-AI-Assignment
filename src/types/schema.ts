export interface Contact {
  id: string;     
  name: string;
  email: string;
  phone: string;
  company: string; 
}

export interface Opportunity {
  id: string;
  name: string;
  value: string;
  status: string;
  closeDate: string;
}

export interface Task {
  id: string;
  description: string;
  dueDate: string;
  isComplete: boolean;
}

export interface StorageShape {
  contacts: Record<string, Contact>;     
  opportunities: Record<string, Opportunity>;
  tasks: Record<string, Task>;
  lastSync: number;
}