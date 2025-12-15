export enum FormMode {
  CREATE = 'create',
  EDIT = 'edit',
  VIEW = 'view'
}

export enum FieldVisibility {
  TABLE = 'table',
  FORM = 'form',
  DETAIL = 'detail',
  NONE = 'none'
}

export enum FieldType {
  STRING = 'string',
  TEXT = 'text',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  DATETIME = 'datetime',
  SELECT = 'select',
  RELATION = 'relation',
  FILE = 'file',
  IMAGE = 'image',
  CUSTOM = 'custom'
}

export enum RelationType {
  BELONGS_TO = 'belongsTo',
  HAS_MANY = 'hasMany',
  MANY_TO_MANY = 'manyToMany'
}
