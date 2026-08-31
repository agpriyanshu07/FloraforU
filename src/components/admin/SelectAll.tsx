"use client";

export default function SelectAll() {
  return (
    <input
      type="checkbox"
      aria-label="Select all products on this page"
      className="h-4 w-4 accent-[#9b2c5a]"
      onChange={(e) => {
        const form = document.getElementById("products-form");
        form
          ?.querySelectorAll<HTMLInputElement>('input[name="ids"]')
          .forEach((box) => {
            box.checked = e.target.checked;
          });
      }}
    />
  );
}
