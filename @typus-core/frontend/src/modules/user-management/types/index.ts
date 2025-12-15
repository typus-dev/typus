// Define Role interface based on backend model
export interface Role {
  id: number;
  name: string;
  description: string;
  // Use Record<string, any> for flexible JSON structure
  abilityRules?: Record<string, any>;
  createdAt: string; // Expect ISO string format
  updatedAt: string; // Expect ISO string format
  deleted: boolean;
}

// Define input type for role creation/update form
export interface RoleFormData {
  name: string;
  description: string;
  // abilityRules might be stringified JSON in the form
  abilityRules?: string;
}
