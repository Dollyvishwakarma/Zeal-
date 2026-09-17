"use client";
import{useEffect,useRef}from"react";
import{useRouter}from"next/navigation";
import{motion,AnimatePresence}from"framer-motion";
import{Phone,MessageCircle,Calendar,X,Volume2,VolumeX}from"lucide-react";
import{useAdminStore}from"@/lib/store/adminStore";
export function IncomingAlertOverlay(){
const router=useRouter();
const{incomingAlert,isAlertOpen,alertSoundMuted,dismissAlert,toggleAlertSound}=useAdminStore();
const audioRef=useRef<HTMLAudioElement|null>(null);
useEffect(()=>{if(isAlertOpen&&!alertSoundMuted&&audioRef.current){audioRef.current.loop=true;audioRef.current.play().catch(()=>{})}if(!isAlertOpen&&audioRef.current){audioRef.current.pause();audioRef.current.currentTime=0}},[isAlertOpen,alertSoundMuted]);
if(!isAlertOpen||!incomingAlert)return null;
const{type,message,data}=incomingAlert;
const icon=type==="chat"?<MessageCircle className="w-12 h-12 text-blue-400"/>:type==="call"?<Phone className="w-12 h-12 text-green-400"/>:<Calendar className="w-12 h-12 text-purple-400"/>;
const title=type==="chat"?"New Chat Request":type==="call"?"Incoming Call":"New Booking Request";
const handleAccept=()=>{if(type==="call")router.push(data&&data.bookingId?"/calls?highlight="+data.bookingId:"/calls");else if(type==="chat")router.push(data&&data.userId?"/clients?highlight="+data.userId:"/clients");else router.push(data&&data.bookingId?"/bookings?highlight="+data.bookingId:"/bookings");dismissAlert()};
return <AnimatePresence><motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"><audio ref={audioRef} src="/sounds/ringing.mp3" preload="auto"/><motion.div initial={{scale:0.9,y:20}} animate={{scale:1,y:0}} exit={{scale:0.9,y:20}} transition={{type:"spring",stiffness:220,damping:24}} className="glass-card-3d max-w-md w-full p-8 text-center border border-white/20"><div className="flex justify-center mb-4"><div className="w-20 h-20 rounded-full bg-[#9D7DC5]/20 flex items-center justify-center animate-pulse">{icon}</div></div><h2 className="text-2xl font-bold text-white">{title}</h2><p className="text-white/70 mt-1">{message}</p>{data&&data.rate?<p className="text-xs text-[#9D7DC5] mt-2">{data.modality||"session"} · {data.rate}/min</p>:null}<div className="flex items-center justify-center gap-4 mt-6"><button onClick={dismissAlert} className="px-6 py-3 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-all"><X className="w-5 h-5 inline mr-2"/> Dismiss</button><button onClick={handleAccept} className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white font-medium hover:shadow-lg hover:shadow-[#533AFD]/30 transition-all">View</button></div><div className="flex items-center justify-center gap-4 mt-4"><button onClick={toggleAlertSound} className="text-white/50 hover:text-white transition-colors" aria-label={alertSoundMuted?"Unmute alert":"Mute alert"}>{alertSoundMuted?<VolumeX className="w-5 h-5"/>:<Volume2 className="w-5 h-5"/>}</button></div></motion.div></motion.div></AnimatePresence>}
