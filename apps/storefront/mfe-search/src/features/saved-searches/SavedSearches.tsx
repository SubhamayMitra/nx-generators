import { Button, Input } from '@nx-generators/shared-ui';
import { useSavedSearches } from './useSavedSearches';

export function SavedSearches() {
  const formik = useSavedSearches();

  return (
    <section>
      <h2>Saved Searches</h2>
      <form onSubmit={formik.handleSubmit} noValidate>
        <label htmlFor="saved-search-name">Name</label>
        <Input
          id="saved-search-name"
          name="name"
          value={formik.values.name}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
        />
        {formik.touched.name && formik.errors.name ? (
          <p role="alert">{formik.errors.name}</p>
        ) : null}

        <label htmlFor="saved-search-query">Query</label>
        <Input
          id="saved-search-query"
          name="query"
          value={formik.values.query}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
        />
        {formik.touched.query && formik.errors.query ? (
          <p role="alert">{formik.errors.query}</p>
        ) : null}

        <Button type="submit" disabled={formik.isSubmitting}>
          Save search
        </Button>
      </form>
    </section>
  );
}

export default SavedSearches;
