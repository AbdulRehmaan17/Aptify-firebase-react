/**
 * Firebase utilities re-export
 * This file re-exports Firebase services from the main config
 * for consistent imports across the application
 */
import { db, auth } from '../firebase/config';

export { db, auth };
export default { db, auth };


