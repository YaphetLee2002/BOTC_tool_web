import React, { PropsWithChildren, useRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import {
  motion,
  MotionValue,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
  useTransform,
} from 'motion/react'
import type { MotionProps } from 'motion/react'

import { cn } from '@/lib/utils'

export interface DockProps extends VariantProps<typeof dockVariants> {
  className?: string
  iconSize?: number
  iconMagnification?: number
  disableMagnification?: boolean
  iconDistance?: number
  direction?: 'top' | 'middle' | 'bottom'
  children: React.ReactNode
}

const DEFAULT_SIZE = 40
const DEFAULT_MAGNIFICATION = 60
const DEFAULT_DISTANCE = 140
const DEFAULT_DISABLEMAGNIFICATION = false

const dockVariants = cva(
  'supports-[backdrop-filter]:bg-white/10 supports-[backdrop-filter]:dark:bg-black/10 mx-auto flex w-max items-center justify-center gap-2 rounded-2xl border p-0 backdrop-blur-md',
)

const Dock = React.forwardRef<HTMLDivElement, DockProps>(
  (
    {
      className,
      children,
      iconSize = DEFAULT_SIZE,
      iconMagnification = DEFAULT_MAGNIFICATION,
      disableMagnification = DEFAULT_DISABLEMAGNIFICATION,
      iconDistance = DEFAULT_DISTANCE,
      direction = 'middle',
      ...props
    },
    ref,
  ) => {
    const mouseX = useMotionValue(Infinity)

    const renderChildren = () => {
      return React.Children.map(children, (child) => {
        if (
          React.isValidElement<DockIconProps>(child) &&
          child.type === DockIcon
        ) {
          return React.cloneElement(child, {
            ...child.props,
            mouseX: mouseX,
            size: iconSize,
            magnification: iconMagnification,
            disableMagnification: disableMagnification,
            distance: iconDistance,
          })
        }
        return child
      })
    }

    // 'middle' 时容器完整容纳放大后的图标；
    // 'top' / 'bottom' 只容纳静止尺寸，hover 时图标会从反方向的边缘溢出。
    const dockHeight =
      direction === 'middle'
        ? iconMagnification
        : iconSize

    return (
      <motion.div
        ref={ref}
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        {...props}
        style={{ height: dockHeight, ...(props as { style?: React.CSSProperties }).style }}
        className={cn(dockVariants({ className }), {
          'items-start': direction === 'top',
          'items-center': direction === 'middle',
          'items-end': direction === 'bottom',
        })}
      >
        {renderChildren()}
      </motion.div>
    )
  },
)

Dock.displayName = 'Dock'

export interface DockIconProps
  extends Omit<
    MotionProps & React.HTMLAttributes<HTMLDivElement>,
    'children'
  > {
  size?: number
  magnification?: number
  disableMagnification?: boolean
  distance?: number
  mouseX?: MotionValue<number>
  className?: string
  children?: React.ReactNode
  props?: PropsWithChildren
}

const DockIcon = ({
  size = DEFAULT_SIZE,
  magnification = DEFAULT_MAGNIFICATION,
  disableMagnification,
  distance = DEFAULT_DISTANCE,
  mouseX,
  className,
  children,
  style: userStyle,
  ...props
}: DockIconProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const padding = Math.max(4, size * 0.08)
  const defaultMouseX = useMotionValue(Infinity)
  const source = mouseX ?? defaultMouseX

  const distanceCalc = useTransform(source, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 }
    return val - bounds.x - bounds.width / 2
  })

  const targetSize = disableMagnification ? size : magnification

  const sizeTransform = useTransform(
    distanceCalc,
    [-distance, 0, distance],
    [size, targetSize, size],
  )

  const scaleSize = useSpring(size, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  })

  useMotionValueEvent(sizeTransform, 'change', (v) => {
    scaleSize.set(v)
  })

  return (
    <motion.div
      ref={ref}
      {...props}
      style={{ ...userStyle, width: scaleSize, height: scaleSize, padding }}
      className={cn(
        'flex aspect-square cursor-pointer items-center justify-center rounded-full',
        disableMagnification && 'hover:bg-muted-foreground transition-colors',
        className,
      )}
    >
      {children}
    </motion.div>
  )
}

DockIcon.displayName = 'DockIcon'

export { Dock, DockIcon, dockVariants }
