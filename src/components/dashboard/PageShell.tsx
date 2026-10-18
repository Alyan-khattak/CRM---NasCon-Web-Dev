import Header from "./Header";
import styles from "./PageShell.module.css";

interface Props {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export default function PageShell({ title, action, children }: Props) {
  return (
    <>
      <Header title={title} />
      <div className={styles.content}>
        {action && <div className={styles.actionRow}>{action}</div>}
        {children}
      </div>
    </>
  );
}
