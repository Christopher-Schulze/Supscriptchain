# Frontend Style Guide

This project uses React and Next.js. Accessibility is a core requirement. Always label form fields with `htmlFor` and provide keyboard interactions for clickable elements.

## Components

We rely on [Radix UI](https://www.radix-ui.com/) as a lightweight component library that provides accessible primitives. Prefer using Radix components over custom HTML where possible.

## ARIA and Keyboard Support

- Every interactive element must be reachable by keyboard.
- Use semantic HTML first; if not possible, add appropriate `role` attributes.
- Dismissible alerts like the `MessageBar` can be closed via `Enter` or `Space`.

## Linting

`eslint-plugin-jsx-a11y` enforces accessibility rules. Run `npm run lint` in `frontend/` to check for violations.
