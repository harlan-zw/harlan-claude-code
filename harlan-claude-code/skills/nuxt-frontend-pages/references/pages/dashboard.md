# Dashboard Patterns

Reference: **Linear**

---

## Keyboard First

- **j/k navigation**: Move through lists without mouse
- **Cmd+K palette**: Universal command access via `UCommandPalette`
- **Right-click context menus**: Power users expect them

---

## Density

- **Hierarchy through typography, not color**: Weight/size > rainbow status colors
- **Status indicators > progress bars**: "Done" badge beats 100% bar
- **Data tables over cards**: Cards waste space for data-heavy views

---

## Actions

- **Undo over confirm**: "Deleted. Undo?" toast beats "Are you sure?" dialog
- **Inline editing**: Click to edit, don't navigate away
- **Batch operations**: Checkbox column + bulk action bar on select

---

## State

- **Filters persist in URL**: Refresh doesn't reset, shareable
- **Filter pills**: Active filters as removable tags
- **Saved views**: Let users save filter combinations

---

## Performance

- **Optimistic updates**: UI updates before server confirms
- **Stale-while-revalidate**: Show cached, refresh quietly
- **Zero state = onboarding**: First empty state is setup wizard

---

## Time

- **Smart groups**: "Today", "Yesterday", "This week"
- **Relative timestamps**: "2h ago" not "2024-01-05 14:32"

---

## Layout

```vue
<template>
  <UDashboardLayout>
    <UDashboardSidebar>
      <UNavigationMenu :items="navItems" />
    </UDashboardSidebar>

    <UDashboardMain>
      <UDashboardToolbar>
        <template #left>
          <UBreadcrumb :items="breadcrumbs" />
        </template>
        <template #right>
          <UButton>New Item</UButton>
        </template>
      </UDashboardToolbar>

      <UTable :columns="columns" :rows="items" :loading="pending" />
    </UDashboardMain>
  </UDashboardLayout>
</template>
```
