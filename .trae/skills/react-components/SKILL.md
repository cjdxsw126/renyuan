---
name: "react-components"
description: "Provides React + TypeScript component development guidelines for the renyuan project. Invoke when user needs to create new components, modify existing ones, or asks about React patterns, state management, or component architecture."
---

# React Components Skill

## Tech Stack
- **Framework**: React 18+
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: CSS (no CSS-in-JS library)

## Component Structure

### File Organization
```
src/
├── components/          # Reusable components
├── pages/              # Page-level components
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
└── App.tsx             # Main application component
```

### Component Template
```typescript
import React, { useState, useEffect } from 'react';

interface ComponentNameProps {
  // Define props here
  title: string;
  onAction: () => void;
}

export const ComponentName: React.FC<ComponentNameProps> = ({ 
  title, 
  onAction 
}) => {
  // State declarations
  const [data, setData] = useState<string>('');
  
  // Effects
  useEffect(() => {
    // Side effects
  }, []);
  
  // Handlers
  const handleClick = () => {
    onAction();
  };
  
  return (
    <div className="component-name">
      <h2>{title}</h2>
      {/* Component JSX */}
    </div>
  );
};
```

## State Management

### Local State
- Use `useState` for component-level state
- Use `useReducer` for complex state logic

### Global State
- Currently using prop drilling in App.tsx
- Consider React Context for deeply nested data
- Avoid unnecessary global state

## Common Patterns

### Form Handling
```typescript
const [formData, setFormData] = useState({
  name: '',
  age: 0
});

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;
  setFormData(prev => ({
    ...prev,
    [name]: value
  }));
};
```

### Async Data Fetching
```typescript
const [data, setData] = useState<Person[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const fetchData = async () => {
  setLoading(true);
  try {
    const result = await storageService.getPersons(datasetId);
    setData(result);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

### Modal/Dialog Pattern
```typescript
const [showModal, setShowModal] = useState(false);

// In JSX
{showModal && (
  <div className="modal-overlay" onClick={() => setShowModal(false)}>
    <div className="modal-content" onClick={e => e.stopPropagation()}>
      {/* Modal content */}
    </div>
  </div>
)}
```

## TypeScript Best Practices

### Interface Naming
- Props interfaces: `ComponentNameProps`
- Data interfaces: `Person`, `Certificate`, `DataSet`
- Use descriptive names

### Type Safety
- Avoid `any` type
- Use union types for limited options: `'admin' | 'member'`
- Define return types for functions

### Common Types
```typescript
// From storageService.ts
export interface Person {
  id: number | string;
  name: string;
  age: number;
  education: string;
  major: string;
  certificates: string[];
  employeeId: string;
  certificateColumns: { [key: string]: string };
  tenure: number;
  graduationTenure: number;
  originalData: any;
  _matchScore?: number;
  _matchDetails?: string;
}
```

## Event Handling

### Button Clicks
```typescript
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  // Handle click
};
```

### Form Submit
```typescript
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  // Handle submit
};
```

### Input Change
```typescript
const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value);
};
```

## Performance Optimization

### Memoization
```typescript
import { useMemo, useCallback } from 'react';

// Memoize expensive calculations
const filteredData = useMemo(() => {
  return data.filter(item => item.age > 25);
}, [data]);

// Memoize callbacks
const handleDelete = useCallback((id: string) => {
  deleteItem(id);
}, []);
```

### List Rendering
```typescript
{items.map((item, index) => (
  <div key={item.id || index}> {/* Use stable IDs */}
    {item.name}
  </div>
))}
```

## Error Boundaries
Consider adding error boundaries for critical components:
```typescript
class ErrorBoundary extends React.Component {
  // Implementation
}
```

## CSS Class Naming
- Use kebab-case: `filter-panel`, `search-input`
- BEM-like structure: `component__element--modifier`
- Keep styles in separate CSS files or inline for dynamic values
