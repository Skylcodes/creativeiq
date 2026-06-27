export type DropdownSource = "user-menu" | "workspace";

export function dispatchCloseDropdowns(except?: DropdownSource) {
  window.dispatchEvent(
    new CustomEvent("app:close-dropdowns", {
      detail: { except },
    }),
  );
}

export function shouldCloseDropdown(
  event: Event,
  self: DropdownSource,
): boolean {
  const except = (event as CustomEvent<{ except?: DropdownSource }>).detail
    ?.except;
  return except !== self;
}
