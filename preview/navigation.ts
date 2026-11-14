import {useSyncExternalStore} from 'react';
const subscribe=(listener:()=>void)=>{window.addEventListener('popstate',listener);return()=>window.removeEventListener('popstate',listener)};
export function usePathname(){return useSyncExternalStore(subscribe,()=>location.pathname,()=>'/')}
export function useRouter(){return {push:(path:string)=>location.assign(path),replace:(path:string)=>location.replace(path),refresh:()=>location.reload(),back:()=>history.back()}}
