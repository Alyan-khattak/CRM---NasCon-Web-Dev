"use client";

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useInView } from 'motion/react';
import styles from './AnimatedList.module.css';

export interface AnimatedListItem {
  title: string;
  message: string;
  time: string;
  avatar?: string;
}

interface AnimatedItemProps {
  children: React.ReactNode;
  delay?: number;
  index: number;
  onMouseEnter?: () => void;
  onClick?: () => void;
}

const AnimatedItem = ({ children, delay = 0, index, onMouseEnter, onClick }: AnimatedItemProps) => {
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.5, once: false });
  return (
    <motion.div
      ref={ref}
      data-index={index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0 }}
      transition={{ duration: 0.2, delay }}
      style={{ cursor: 'pointer' }}
    >
      {children}
    </motion.div>
  );
};

interface AnimatedListProps {
  items?: AnimatedListItem[];
  onItemSelect?: (item: AnimatedListItem, index: number) => void;
  showGradients?: boolean;
  enableArrowNavigation?: boolean;
  className?: string;
  itemClassName?: string;
  displayScrollbar?: boolean;
  initialSelectedIndex?: number;
  autoScroll?: boolean;
  onScrolledCountChange?: (count: number | string) => void;
}

const AnimatedList = ({
  items = [],
  onItemSelect,
  showGradients = true,
  enableArrowNavigation = true,
  className = '',
  itemClassName = '',
  displayScrollbar = true,
  initialSelectedIndex = -1,
  autoScroll = false,
  onScrolledCountChange
}: AnimatedListProps) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);
  const [keyboardNav, setKeyboardNav] = useState(false);
  const [topGradientOpacity, setTopGradientOpacity] = useState(0);
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState(1);
  const isWaitingRef = useRef(false);

  const handleItemMouseEnter = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const handleItemClick = useCallback(
    (item: AnimatedListItem, index: number) => {
      setSelectedIndex(index);
      if (onItemSelect) {
        onItemSelect(item, index);
      }
    },
    [onItemSelect]
  );

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;
    setTopGradientOpacity(Math.min(scrollTop / 50, 1));
    const bottomDistance = scrollHeight - (scrollTop + clientHeight);
    setBottomGradientOpacity(scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1));
  }, []);

  useEffect(() => {
    if (!enableArrowNavigation) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex((prev: number) => Math.min(prev + 1, items.length - 1));
      } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex((prev: number) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        if (selectedIndex >= 0 && selectedIndex < items.length) {
          e.preventDefault();
          if (onItemSelect) {
            onItemSelect(items[selectedIndex], selectedIndex);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIndex, onItemSelect, enableArrowNavigation]);

  useEffect(() => {
    if (!keyboardNav || selectedIndex < 0 || !listRef.current) return;
    const container = listRef.current;
    const selectedItem = container.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
    if (selectedItem) {
      const extraMargin = 50;
      const containerScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const itemTop = selectedItem.offsetTop;
      const itemBottom = itemTop + selectedItem.offsetHeight;
      if (itemTop < containerScrollTop + extraMargin) {
        container.scrollTo({ top: itemTop - extraMargin, behavior: 'smooth' });
      } else if (itemBottom > containerScrollTop + containerHeight - extraMargin) {
        container.scrollTo({
          top: itemBottom - containerHeight + extraMargin,
          behavior: 'smooth'
        });
      }
    }
    setKeyboardNav(false);
  }, [selectedIndex, keyboardNav]);

  // Auto scroll logic
  useEffect(() => {
    if (!autoScroll || !listRef.current) return;
    
    let animationFrameId: number;
    let timeoutId: NodeJS.Timeout;
    let lastTime = performance.now();
    
    const scrollLoop = (time: number) => {
      if (!listRef.current) return;
      if (isWaitingRef.current) {
        lastTime = time; // keep lastTime updated while waiting
        animationFrameId = requestAnimationFrame(scrollLoop);
        return;
      }

      if (time - lastTime > 16) {
        const { scrollTop, scrollHeight, clientHeight } = listRef.current;
        const maxScroll = scrollHeight - clientHeight;
        const progress = maxScroll > 0 ? scrollTop / maxScroll : 0;
        
        // Report progress
        if (onScrolledCountChange) {
          // Simulate 110 chats even if there are less actual items
          let fakeCount = Math.floor(progress * 110);
          if (fakeCount >= 110) fakeCount = 110;
          
          onScrolledCountChange(fakeCount > 99 ? '99+' : fakeCount);
        }

        // Determine if we've hit the bottom (with a 2px buffer for rounding)
        const isBottom = Math.ceil(scrollTop) >= maxScroll - 2;

        if (!isBottom) {
          // Cap speed at ~20px/frame so chats don't skip rendering or go invisible
          const currentSpeed = 4 + (Math.pow(progress, 1.5) * 16);
          listRef.current.scrollTop += currentSpeed;
        } else {
          // Reached bottom
          isWaitingRef.current = true;
          timeoutId = setTimeout(() => {
            if (listRef.current) {
              listRef.current.scrollTop = 0;
            }
            if (onScrolledCountChange) onScrolledCountChange(0);
            isWaitingRef.current = false;
          }, 3000);
        }
        lastTime = time;
      }
      animationFrameId = requestAnimationFrame(scrollLoop);
    };
    
    animationFrameId = requestAnimationFrame(scrollLoop);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(timeoutId);
    };
  }, [autoScroll, items.length, onScrolledCountChange]);

  return (
    <div className={`${styles.scrollListContainer} ${className}`}>
      <div 
        ref={listRef} 
        className={`${styles.scrollList} ${!displayScrollbar ? styles.noScrollbar : ''}`} 
        onScroll={handleScroll}
      >
        {items.map((item: AnimatedListItem, index: number) => (
          <AnimatedItem
            key={index}
            delay={0.1}
            index={index}
            onMouseEnter={() => handleItemMouseEnter(index)}
            onClick={() => handleItemClick(item, index)}
          >
            <div className={`${styles.chatRow} ${selectedIndex === index ? styles.itemSelected : ''} ${itemClassName}`}>
              {item.avatar ? (
                <img src={item.avatar} alt="Avatar" className={styles.chatAvatar} />
              ) : (
                <div className={styles.chatAvatar} />
              )}
              <div className={styles.chatInfo}>
                <div className={styles.chatTitle}>{item.title}</div>
                <div className={styles.chatPreview}>{item.message}</div>
              </div>
              <div className={styles.chatTime}>{item.time}</div>
            </div>
          </AnimatedItem>
        ))}
      </div>
      {showGradients && (
        <>
          <div className={styles.topGradient} style={{ opacity: topGradientOpacity }}></div>
          <div className={styles.bottomGradient} style={{ opacity: bottomGradientOpacity }}></div>
        </>
      )}
    </div>
  );
};

export default AnimatedList;
