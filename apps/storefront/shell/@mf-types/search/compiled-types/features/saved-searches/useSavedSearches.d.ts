/**
 * The shared-validation end-to-end example: this Formik form validates
 * against the exact same `saveSearchInputSchema` (from
 * libs/shared-validation) that search-service's `saveSearch` resolver
 * validates against server-side — write once, validate on both sides.
 */
export declare function useSavedSearches(): {
  initialValues: {
    name: string;
    query: string;
  };
  initialErrors: import('formik').FormikErrors<unknown>;
  initialTouched: import('formik').FormikTouched<unknown>;
  initialStatus: any;
  handleBlur: {
    (e: React.FocusEvent<any, Element>): void;
    <T = any>(fieldOrEvent: T): T extends string ? (e: any) => void : void;
  };
  handleChange: {
    (e: React.ChangeEvent<any>): void;
    <T_1 = string | React.ChangeEvent<any>>(
      field: T_1,
    ): T_1 extends React.ChangeEvent<any>
      ? void
      : (e: string | React.ChangeEvent<any>) => void;
  };
  handleReset: (e: any) => void;
  handleSubmit: (e?: React.FormEvent<HTMLFormElement>) => void;
  resetForm: (
    nextState?:
      | Partial<
          import('formik').FormikState<{
            name: string;
            query: string;
          }>
        >
      | undefined,
  ) => void;
  setErrors: (
    errors: import('formik').FormikErrors<{
      name: string;
      query: string;
    }>,
  ) => void;
  setFormikState: (
    stateOrCb:
      | import('formik').FormikState<{
          name: string;
          query: string;
        }>
      | ((
          state: import('formik').FormikState<{
            name: string;
            query: string;
          }>,
        ) => import('formik').FormikState<{
          name: string;
          query: string;
        }>),
  ) => void;
  setFieldTouched: (
    field: string,
    touched?: boolean,
    shouldValidate?: boolean,
  ) =>
    | Promise<void>
    | Promise<
        import('formik').FormikErrors<{
          name: string;
          query: string;
        }>
      >;
  setFieldValue: (
    field: string,
    value: React.SetStateAction<any>,
    shouldValidate?: boolean,
  ) =>
    | Promise<void>
    | Promise<
        import('formik').FormikErrors<{
          name: string;
          query: string;
        }>
      >;
  setFieldError: (field: string, value: string | undefined) => void;
  setStatus: (status: any) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  setTouched: (
    touched: import('formik').FormikTouched<{
      name: string;
      query: string;
    }>,
    shouldValidate?: boolean,
  ) =>
    | Promise<void>
    | Promise<
        import('formik').FormikErrors<{
          name: string;
          query: string;
        }>
      >;
  setValues: (
    values: import('react').SetStateAction<{
      name: string;
      query: string;
    }>,
    shouldValidate?: boolean,
  ) =>
    | Promise<void>
    | Promise<
        import('formik').FormikErrors<{
          name: string;
          query: string;
        }>
      >;
  submitForm: () => Promise<any>;
  validateForm: (
    values?:
      | {
          name: string;
          query: string;
        }
      | undefined,
  ) => Promise<
    import('formik').FormikErrors<{
      name: string;
      query: string;
    }>
  >;
  validateField: (name: string) => Promise<void> | Promise<string | undefined>;
  isValid: boolean;
  dirty: boolean;
  unregisterField: (name: string) => void;
  registerField: (name: string, { validate }: any) => void;
  getFieldProps: (
    nameOrOptions: string | import('formik').FieldConfig<any>,
  ) => import('formik').FieldInputProps<any>;
  getFieldMeta: (name: string) => import('formik').FieldMetaProps<any>;
  getFieldHelpers: (name: string) => import('formik').FieldHelperProps<any>;
  validateOnBlur: boolean;
  validateOnChange: boolean;
  validateOnMount: boolean;
  values: {
    name: string;
    query: string;
  };
  errors: import('formik').FormikErrors<{
    name: string;
    query: string;
  }>;
  touched: import('formik').FormikTouched<{
    name: string;
    query: string;
  }>;
  isSubmitting: boolean;
  isValidating: boolean;
  status?: any;
  submitCount: number;
};
//# sourceMappingURL=useSavedSearches.d.ts.map
