export interface Contact {
  id: string;     
  name: string;      
  lead: string;      
  emails: string[];
  phones: string[];
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
  assignee: string;
  isComplete: boolean;
}

export interface StorageShape {
  contacts: Record<string, Contact>;     
  opportunities: Record<string, Opportunity>;
  tasks: Record<string, Task>;
  lastSync: number;
}