export type Tool = 'select' | 'text' | 'draw' | 'highlight' | 'image' | 'eraser';

export interface PageState {
  id: string;
  originalIndex: number;
  rotation: number;
  fabricJSON: object | null;
  formValues: Record<string, string>;
}

export interface FormFieldInfo {
  id: string;
  subtype: string;
  rect: { left: number; top: number; width: number; height: number };
  fieldName: string;
  options?: string[];
  defaultValue?: string;
  multiLine?: boolean;
}
