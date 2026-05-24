import 'charter-webfont/charter.css';
import './styles.css';
import { mountApp } from './ui/app';

const root = document.querySelector<HTMLElement>('#app');

if (!root) {
  throw new Error('Application root is unavailable.');
}

mountApp(root);
