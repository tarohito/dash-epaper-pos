import React, { useEffect, useRef } from'react';
import tippy, { Instance, Placement } from'tippy.js';
import'tippy.js/dist/tippy.css';

export interface TooltipProps {
  children: React.ReactElement;
  content: React.ReactNode;
  side?:'top' |'right' |'bottom' |'left';
  sideOffset?: number;
  delayDuration?: number;
  disabled?: boolean;
}

export const TooltipProvider = ({ children }: { children: React.ReactNode; delayDuration?: number }) => <>{children}</>;

export const Tooltip = ({
  children,
  content,
  side ='top',
  sideOffset = 8,
  delayDuration = 80,
  disabled = false,
}: TooltipProps) => {
  const targetRef = useRef<HTMLElement | null>(null);
  const instanceRef = useRef<Instance | null>(null);

  useEffect(() => {
    const el = targetRef.current;
    if (!el || disabled || !content) {
      if (instanceRef.current) {
        instanceRef.current.destroy();
        instanceRef.current = null;
      }
      return;
    }

    const tooltipContent = typeof content ==='string' ? content : String(content);

    instanceRef.current = tippy(el, {
      content: tooltipContent,
      placement: side as Placement,
      offset: [0, sideOffset],
      delay: [delayDuration, 0],
      duration: [150, 100],
      arrow: true,
      animation:'fade',
    });

    return () => {
      if (instanceRef.current) {
        instanceRef.current.destroy();
        instanceRef.current = null;
      }
    };
  }, [content, side, sideOffset, delayDuration, disabled]);

  if (disabled || !content) {
    return children;
  }

  return React.cloneElement(children as React.ReactElement<any>, {
    ref: (node: HTMLElement | null) => {
      targetRef.current = node;
      const childProps = (children as any).props;
      if (childProps && typeof childProps ==='object' &&'ref' in childProps) {
        const childRef = childProps.ref;
        if (typeof childRef ==='function') {
          childRef(node);
        } else if (childRef && typeof childRef ==='object' &&'current' in childRef) {
          childRef.current = node;
        }
      }
    },
  });
};

export default Tooltip;
