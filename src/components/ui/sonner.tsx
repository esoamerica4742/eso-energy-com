import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="bottom-right"
      gap={10}
      offset={20}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "group toast toast-spring-in backdrop-blur-2xl !bg-[oklch(0.18_0.025_265_/_0.85)] !text-foreground !border !border-white/[0.07] !shadow-[0_24px_60px_oklch(0_0_0_/_0.6),0_0_28px_oklch(0.62_0.20_277_/_0.18)]",
          description: "group-[.toast]:text-silver",
          actionButton:
            "!bg-[oklch(0.62_0.20_277)] !text-white hover:!bg-[oklch(0.68_0.20_277)]",
          cancelButton: "!bg-white/5 !text-silver hover:!bg-white/10",
          success: "!border-[oklch(0.74_0.17_165_/_0.45)]",
          error: "!border-[oklch(0.78_0.18_25_/_0.55)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
