'use client';
import * as Form from '@radix-ui/react-form';

interface InputFieldProps {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  error?: string | null;
}

export default function InputField({
  name,
  label,
  value,
  onChange,
  type = 'text',
  error,
}: InputFieldProps) {
  return (
    <Form.Field name={name} className="field">
      <Form.Label htmlFor={name}>{label}</Form.Label>
      <Form.Control asChild>
        <input id={name} value={value} onChange={(e) => onChange(e.target.value)} type={type} />
      </Form.Control>
      {error && <Form.Message className="error">{error}</Form.Message>}
    </Form.Field>
  );
}
