"use client";

/**
 * Destructive actions always confirm first. The confirm text names the record
 * so an admin can't delete the wrong thing by muscle memory.
 */
export default function DeleteButton({
  action,
  id,
  label = "Delete",
  confirmText,
  extraFields,
  className = "btn-danger btn-sm",
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  label?: string;
  confirmText: string;
  extraFields?: Record<string, string>;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
      className="inline"
    >
      <input type="hidden" name="id" value={id} />
      {extraFields &&
        Object.entries(extraFields).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}
