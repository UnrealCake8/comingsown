import {useEffect,useRef,useState} from 'react';
import {Room,RoomEvent,Track} from 'livekit-client';
import {Mic,MicOff,Video,VideoOff,MonitorUp,MonitorOff,PhoneOff,Phone,Users,ShieldCheck} from 'lucide-react';
import {request} from '../lib/supabase';
type Props={space:string;restricted:boolean;userId:string};
export default function Call({space,restricted}:Props){
 const roomRef=useRef<Room|null>(null),stage=useRef<HTMLDivElement>(null);
 const [joined,setJoined]=useState(false),[connecting,setConnecting]=useState(false),[mic,setMic]=useState(false),[cam,setCam]=useState(false),[sharing,setSharing]=useState(false),[people,setPeople]=useState(0),[error,setError]=useState('');
 function clear(){stage.current?.replaceChildren();setJoined(false);setMic(false);setCam(false);setSharing(false);setPeople(0)}
 function sync(room:Room){setPeople(room.remoteParticipants.size+1);setSharing(room.localParticipant.isScreenShareEnabled)}
 async function join(){
  if(connecting||joined)return;
  setConnecting(true);setError('');
  try{
   const {url,token}=await request<{url:string,token:string}>('/call/'+space,{});
   const room=new Room({adaptiveStream:true,dynacast:true});
   roomRef.current=room;
   room.on(RoomEvent.TrackSubscribed,(track,_publication,participant)=>{
    const element=track.attach();
    element.dataset.participant=participant.identity;
    if(track.kind===Track.Kind.Video){element.className='call-media';}
    else {element.style.display='none';}
    stage.current?.append(element);
   });
   room.on(RoomEvent.TrackUnsubscribed,track=>track.detach().forEach(element=>element.remove()));
   room.on(RoomEvent.ParticipantConnected,()=>sync(room));
   room.on(RoomEvent.ParticipantDisconnected,()=>sync(room));
   room.on(RoomEvent.LocalTrackUnpublished,()=>sync(room));
   room.on(RoomEvent.Disconnected,clear);
   await room.connect(url,token);
   setJoined(true);sync(room);
  }catch(e){setError(String(e));await roomRef.current?.disconnect();roomRef.current=null;}finally{setConnecting(false)}
 }
 async function leave(){await roomRef.current?.disconnect();roomRef.current=null;clear()}
 async function toggleMic(){const room=roomRef.current;if(!room)return;try{const next=!mic;await room.localParticipant.setMicrophoneEnabled(next);setMic(next)}catch(e){setError(String(e))}}
 async function toggleCam(){const room=roomRef.current;if(!room||restricted)return;try{const next=!cam;await room.localParticipant.setCameraEnabled(next);setCam(next)}catch(e){setError(String(e))}}
 async function toggleShare(){const room=roomRef.current;if(!room)return;try{const next=!sharing;await room.localParticipant.setScreenShareEnabled(next);sync(room)}catch(e){setError(String(e))}}
 useEffect(()=>()=>{void roomRef.current?.disconnect()},[space]);
 return <section className="call-room">
  <div className="call-room-heading"><div><span className="call-kicker">{joined?'● CONNECTED':'VOICE · VIDEO · SCREEN SHARE'}</span><h2>{joined?'You’re in the call':'Get together, instantly.'}</h2><p>{joined?'Talk, turn on your camera, or present your screen.':'Your Space is ready for a conversation.'}</p></div><span className="call-people"><Users size={16}/>{joined?people+' in call':'Private Space'}</span></div>
  <div className={'call-stage '+(joined?'in-call':'')}>
   <div className="call-stage-placeholder"><div className="call-stage-icon"><Phone size={30}/></div><h3>{joined?'Connected to your Space':'Your next conversation starts here'}</h3><p>{joined?'Other people’s video and shared screens appear here.':'Join with audio, video, or share a screen with everyone in your Space.'}</p></div>
   <div ref={stage} className="video-stage"/>
  </div>
  <div className="call-toolbar">
   {!joined?<button className="call-join" disabled={connecting} onClick={()=>void join()}><Phone size={19}/>{connecting?'Connecting…':'Join call'}</button>:<>
    <button className={'call-control '+(mic?'is-on':'')} onClick={()=>void toggleMic()}>{mic?<Mic size={20}/>:<MicOff size={20}/>}<span>{mic?'Mute':'Unmute'}</span></button>
    <button className={'call-control '+(cam?'is-on':'')} disabled={restricted} title={restricted?'Restricted Video is enabled; camera access is disabled until whitelist enforcement is complete.':undefined} onClick={()=>void toggleCam()}>{cam?<Video size={20}/>:<VideoOff size={20}/>}<span>{cam?'Stop video':'Start video'}</span></button>
    <button className={'call-control '+(sharing?'is-on':'')} onClick={()=>void toggleShare()}>{sharing?<MonitorOff size={20}/>:<MonitorUp size={20}/>}<span>{sharing?'Stop sharing':'Share screen'}</span></button>
    <button className="call-control call-hangup" onClick={()=>void leave()}><PhoneOff size={20}/><span>Leave</span></button>
   </>}
  </div>
  {restricted&&<div className="call-privacy"><ShieldCheck size={16}/> Restricted Video is on. Camera publishing remains disabled until whitelist-only delivery is implemented. Screen sharing is visible to call participants.</div>}
  {error&&<p role="alert" className="error">{error}</p>}
 </section>
}
