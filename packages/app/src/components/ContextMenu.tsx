import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { FC, forwardRef, useEffect, useState } from 'react';
import { CSSTransition } from 'react-transition-group';
import { useStableCallback } from '../hooks/useStableCallback';
import { useFloating, useMergeRefs, autoUpdate, shift, flip } from '@floating-ui/react';
import {
  ContextMenuConfiguration,
  useContextMenuConfiguration,
  ContextMenuItem as ContextMenuConfigItem,
} from '../hooks/useContextMenuConfiguration';

const menuReferenceStyles = css`
  position: absolute;
`;

export const menuStyles = css`
  background-color: var(--grey-darkest);
  border: 2px solid var(--grey-darkish);
  border-radius: 4px;
  box-shadow: 0 8px 16px var(--shadow-dark);
  font-family: 'Roboto Mono', monospace;
  color: var(--foreground);
  font-size: 13px;
  padding: 0;
  z-index: 1;
  min-width: 150px;
  user-select: none;

  &:after {
    content: '';
    position: absolute;
    top: -8px;
    left: 5px;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 0 8px 8px 8px;
    border-color: transparent transparent var(--grey-darkish) transparent;
    pointer-events: none;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
`;

export type ContextMenuContext = {
  [P in keyof ContextMenuConfiguration['contexts']]: {
    type: P;
    data: ContextMenuConfiguration['contexts'][P]['contextType'];
  };
}[keyof ContextMenuConfiguration['contexts']];

export interface ContextMenuProps {
  x: number;
  y: number;
  context: ContextMenuContext;
  onMenuItemSelected?: (id: string, data: unknown, context: ContextMenuContext, meta: { x: number; y: number }) => void;
}

export const ContextMenu = forwardRef<HTMLDivElement, ContextMenuProps>(
  ({ x, y, context, onMenuItemSelected }, ref) => {
    const { refs, floatingStyles, update } = useFloating({
      placement: 'bottom-start',
      whileElementsMounted: autoUpdate,
      middleware: [shift({ crossAxis: true })],
    });

    const anchorRef = useMergeRefs([ref, refs.setReference]);

    const config = useContextMenuConfiguration();
    const { items } = config.contexts[context.type];

    useEffect(() => {
      update();
    }, [update, x, y]);

    const handleMenuItemSelected = useStableCallback((id: string, data: unknown) => {
      onMenuItemSelected?.(id, data, context, { x, y });
    });

    return (
      <div
        ref={anchorRef}
        css={menuReferenceStyles}
        style={{ top: y + 4, left: x - 16 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={floatingStyles} css={menuStyles} ref={refs.setFloating}>
          {items.map((item) => (
            <ContextMenuItem
              key={item.id}
              config={item}
              onMenuItemSelected={handleMenuItemSelected}
              context={context.data}
            />
          ))}
        </div>
      </div>
    );
  },
);

export const submenuStyles = css`
  position: absolute;
  top: 0;
  left: 95%;
  margin-left: 4px;
  margin-top: -4px;
  min-width: 150px;
  border: 2px solid var(--grey-darkish);
  border-radius: 4px;
  box-shadow: 0 8px 16px var(--shadow-dark);
  background-color: var(--grey-darkest);
  color: var(--foreground);
  z-index: 1;
  padding: 0;
  &.submenu-enter {
    opacity: 0;
  }

  &.submenu-enter-active {
    opacity: 1;
    transition: opacity 100ms ease-out;
  }

  &.submenu-exit {
    opacity: 1;
  }

  &.submenu-exit-active {
    opacity: 0;
    transition: opacity 100ms ease-out;
  }
`;

export const ContextMenuItemDiv = styled.div<{ hasSubmenu?: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 4px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  white-space: nowrap;
  transition: background-color 0.1s ease-out, color 0.1s ease-out;

  .label {
    display: flex;
    align-items: center;
    gap: 8px;
    user-select: none;
  }

  &:hover {
    background-color: #4444446e;
    color: var(--primary);
  }

  ${(props) =>
    props.hasSubmenu &&
    css`
      &::after {
        content: '';
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        width: 0;
        height: 0;
        border-style: solid;
        border-width: 7px 0 7px 7px;
        border-color: transparent transparent transparent var(--grey-darkish);
      }

      &:hover::after {
        border-color: transparent transparent transparent var(--primary);
      }
    `}
`;

export interface ContextMenuItemProps {
  config: ContextMenuConfigItem;
  context: unknown;
  onMenuItemSelected?: (id: string, data: unknown) => void;
}

export const ContextMenuItem: FC<ContextMenuItemProps> = ({ config, onMenuItemSelected, context }) => {
  const [isSubMenuVisible, setIsSubMenuVisible] = useState(false);
  const hasSubMenu = (config.items?.length ?? 0) > 0;
  const { refs, floatingStyles } = useFloating({
    placement: 'right-start',
    whileElementsMounted: autoUpdate,
    middleware: [flip()],
  });

  const handleMouseEnter = useStableCallback(() => {
    if (hasSubMenu) {
      setIsSubMenuVisible(true);
    }
  });

  const handleMouseLeave = useStableCallback(() => {
    if (hasSubMenu) {
      setIsSubMenuVisible(false);
    }
  });

  const handleClick = () => {
    if (hasSubMenu) {
      return;
    }

    onMenuItemSelected?.(config.id, config.data);
  };

  if (config.conditional && !config.conditional(context)) {
    return null;
  }

  return (
    <ContextMenuItemDiv
      hasSubmenu={hasSubMenu}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={refs.setReference}
    >
      <div className="label">
        {config.icon && <config.icon />}
        {config.label}
      </div>
      <CSSTransition nodeRef={refs.floating} in={isSubMenuVisible} timeout={100} classNames="submenu" unmountOnExit>
        <div ref={refs.setFloating} css={submenuStyles} style={floatingStyles}>
          {hasSubMenu &&
            config.items!.map((subItem) => (
              <ContextMenuItem
                key={subItem.id}
                config={subItem}
                onMenuItemSelected={onMenuItemSelected}
                context={context}
              />
            ))}
        </div>
      </CSSTransition>
    </ContextMenuItemDiv>
  );
};