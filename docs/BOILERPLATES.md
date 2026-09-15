# Boilerplate provenance

This project was initialized by cloning both requested Brocoders templates on 2026-09-15 and reducing them to the assessment scope.

- Backend: https://github.com/brocoders/nestjs-boilerplate at `9620f159eefe38f47747d02ab162852367c5472c`.
- Frontend: https://github.com/brocoders/extensive-react-boilerplate at `842f17720b497c58398d0ad62a250313842de194`.

Both original MIT LICENSE files are retained in their respective directories. Backend configuration validation (`src/utils/validate-config.ts`), Nest/TypeORM async configuration, Passport JWT strategy, modular services, seeding, and testing patterns originate from the backend template. The React template supplies `cn`, Button, Input, Label, Textarea, and the React Hook Form text input component. Its React Query, Hook Form/Yup and shadcn/Tailwind architecture is retained. Next.js routing and server rendering are replaced by React Router and Vite; social login, mail, admin, uploads, and generators were removed because this assessment does not require them. All invoice features are implemented specifically for this project.
