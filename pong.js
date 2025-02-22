var Module=typeof Module!="undefined"?Module:{};var ENVIRONMENT_IS_WEB=typeof window=="object";var ENVIRONMENT_IS_WORKER=typeof WorkerGlobalScope!="undefined";var ENVIRONMENT_IS_NODE=typeof process=="object"&&typeof process.versions=="object"&&typeof process.versions.node=="string"&&process.type!="renderer";if(ENVIRONMENT_IS_NODE){}var moduleOverrides=Object.assign({},Module);var arguments_=[];var thisProgram="./this.program";var quit_=(status,toThrow)=>{throw toThrow};var scriptDirectory="";function locateFile(path){if(Module["locateFile"]){return Module["locateFile"](path,scriptDirectory)}return scriptDirectory+path}var readAsync,readBinary;if(ENVIRONMENT_IS_NODE){var fs=require("fs");var nodePath=require("path");scriptDirectory=__dirname+"/";readBinary=filename=>{filename=isFileURI(filename)?new URL(filename):filename;var ret=fs.readFileSync(filename);return ret};readAsync=async(filename,binary=true)=>{filename=isFileURI(filename)?new URL(filename):filename;var ret=fs.readFileSync(filename,binary?undefined:"utf8");return ret};if(!Module["thisProgram"]&&process.argv.length>1){thisProgram=process.argv[1].replace(/\\/g,"/")}arguments_=process.argv.slice(2);if(typeof module!="undefined"){module["exports"]=Module}quit_=(status,toThrow)=>{process.exitCode=status;throw toThrow}}else if(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER){if(ENVIRONMENT_IS_WORKER){scriptDirectory=self.location.href}else if(typeof document!="undefined"&&document.currentScript){scriptDirectory=document.currentScript.src}if(scriptDirectory.startsWith("blob:")){scriptDirectory=""}else{scriptDirectory=scriptDirectory.slice(0,scriptDirectory.replace(/[?#].*/,"").lastIndexOf("/")+1)}{if(ENVIRONMENT_IS_WORKER){readBinary=url=>{var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.responseType="arraybuffer";xhr.send(null);return new Uint8Array(xhr.response)}}readAsync=async url=>{if(isFileURI(url)){return new Promise((resolve,reject)=>{var xhr=new XMLHttpRequest;xhr.open("GET",url,true);xhr.responseType="arraybuffer";xhr.onload=()=>{if(xhr.status==200||xhr.status==0&&xhr.response){resolve(xhr.response);return}reject(xhr.status)};xhr.onerror=reject;xhr.send(null)})}var response=await fetch(url,{credentials:"same-origin"});if(response.ok){return response.arrayBuffer()}throw new Error(response.status+" : "+response.url)}}}else{}var out=Module["print"]||console.log.bind(console);var err=Module["printErr"]||console.error.bind(console);Object.assign(Module,moduleOverrides);moduleOverrides=null;if(Module["arguments"])arguments_=Module["arguments"];if(Module["thisProgram"])thisProgram=Module["thisProgram"];var wasmBinary=Module["wasmBinary"];var wasmMemory;var ABORT=false;var EXITSTATUS;var HEAP8,HEAPU8,HEAP16,HEAPU16,HEAP32,HEAPU32,HEAPF32,HEAP64,HEAPU64,HEAPF64;var runtimeInitialized=false;var isFileURI=filename=>filename.startsWith("file://");function updateMemoryViews(){var b=wasmMemory.buffer;Module["HEAP8"]=HEAP8=new Int8Array(b);Module["HEAP16"]=HEAP16=new Int16Array(b);Module["HEAPU8"]=HEAPU8=new Uint8Array(b);Module["HEAPU16"]=HEAPU16=new Uint16Array(b);Module["HEAP32"]=HEAP32=new Int32Array(b);Module["HEAPU32"]=HEAPU32=new Uint32Array(b);Module["HEAPF32"]=HEAPF32=new Float32Array(b);Module["HEAPF64"]=HEAPF64=new Float64Array(b);Module["HEAP64"]=HEAP64=new BigInt64Array(b);Module["HEAPU64"]=HEAPU64=new BigUint64Array(b)}function preRun(){if(Module["preRun"]){if(typeof Module["preRun"]=="function")Module["preRun"]=[Module["preRun"]];while(Module["preRun"].length){addOnPreRun(Module["preRun"].shift())}}callRuntimeCallbacks(onPreRuns)}function initRuntime(){runtimeInitialized=true;wasmExports["__wasm_call_ctors"]()}function postRun(){if(Module["postRun"]){if(typeof Module["postRun"]=="function")Module["postRun"]=[Module["postRun"]];while(Module["postRun"].length){addOnPostRun(Module["postRun"].shift())}}callRuntimeCallbacks(onPostRuns)}var runDependencies=0;var dependenciesFulfilled=null;function addRunDependency(id){runDependencies++;Module["monitorRunDependencies"]?.(runDependencies)}function removeRunDependency(id){runDependencies--;Module["monitorRunDependencies"]?.(runDependencies);if(runDependencies==0){if(dependenciesFulfilled){var callback=dependenciesFulfilled;dependenciesFulfilled=null;callback()}}}function abort(what){Module["onAbort"]?.(what);what="Aborted("+what+")";err(what);ABORT=true;what+=". Build with -sASSERTIONS for more info.";var e=new WebAssembly.RuntimeError(what);throw e}var wasmBinaryFile;function findWasmBinary(){return locateFile("pong.wasm")}function getBinarySync(file){if(file==wasmBinaryFile&&wasmBinary){return new Uint8Array(wasmBinary)}if(readBinary){return readBinary(file)}throw"both async and sync fetching of the wasm failed"}async function getWasmBinary(binaryFile){if(!wasmBinary){try{var response=await readAsync(binaryFile);return new Uint8Array(response)}catch{}}return getBinarySync(binaryFile)}async function instantiateArrayBuffer(binaryFile,imports){try{var binary=await getWasmBinary(binaryFile);var instance=await WebAssembly.instantiate(binary,imports);return instance}catch(reason){err(`failed to asynchronously prepare wasm: ${reason}`);abort(reason)}}async function instantiateAsync(binary,binaryFile,imports){if(!binary&&typeof WebAssembly.instantiateStreaming=="function"&&!isFileURI(binaryFile)&&!ENVIRONMENT_IS_NODE){try{var response=fetch(binaryFile,{credentials:"same-origin"});var instantiationResult=await WebAssembly.instantiateStreaming(response,imports);return instantiationResult}catch(reason){err(`wasm streaming compile failed: ${reason}`);err("falling back to ArrayBuffer instantiation")}}return instantiateArrayBuffer(binaryFile,imports)}function getWasmImports(){return{env:wasmImports,wasi_snapshot_preview1:wasmImports}}async function createWasm(){function receiveInstance(instance,module){wasmExports=instance.exports;wasmMemory=wasmExports["memory"];updateMemoryViews();wasmTable=wasmExports["__indirect_function_table"];removeRunDependency("wasm-instantiate");return wasmExports}addRunDependency("wasm-instantiate");function receiveInstantiationResult(result){return receiveInstance(result["instance"])}var info=getWasmImports();if(Module["instantiateWasm"]){return new Promise((resolve,reject)=>{Module["instantiateWasm"](info,(mod,inst)=>{receiveInstance(mod,inst);resolve(mod.exports)})})}wasmBinaryFile??=findWasmBinary();var result=await instantiateAsync(wasmBinary,wasmBinaryFile,info);var exports=receiveInstantiationResult(result);return exports}var ASM_CONSTS={2044:$0=>{if(typeof updateStatus==="function"){updateStatus(UTF8ToString($0))}if(typeof showNewGameButton==="function"){showNewGameButton()}},2194:($0,$1,$2,$3,$4,$5)=>{if(typeof sendGameState==="function"){sendGameState($0,$1,$2,$3,$4,$5)}},2282:()=>{if(typeof sendPaddleInput==="function"){sendPaddleInput("up")}},2356:()=>{if(typeof sendPaddleInput==="function"){sendPaddleInput("down")}}};function clearCanvas(){var canvas=document.getElementById("pongCanvas");if(!canvas)return;var ctx=canvas.getContext("2d");ctx.clearRect(0,0,canvas.width,canvas.height)}function drawRect(x,y,w,h,color){var canvas=document.getElementById("pongCanvas");if(!canvas)return;var ctx=canvas.getContext("2d");ctx.fillStyle=UTF8ToString(color);ctx.fillRect(x,y,w,h)}function drawText(text,x,y){var canvas=document.getElementById("pongCanvas");if(!canvas)return;var ctx=canvas.getContext("2d");ctx.font="30px Arial";ctx.fillStyle="black";ctx.fillText(UTF8ToString(text),x,y)}class ExitStatus{name="ExitStatus";constructor(status){this.message=`Program terminated with exit(${status})`;this.status=status}}var callRuntimeCallbacks=callbacks=>{while(callbacks.length>0){callbacks.shift()(Module)}};var onPostRuns=[];var addOnPostRun=cb=>onPostRuns.unshift(cb);var onPreRuns=[];var addOnPreRun=cb=>onPreRuns.unshift(cb);var noExitRuntime=Module["noExitRuntime"]||true;var stackRestore=val=>__emscripten_stack_restore(val);var stackSave=()=>_emscripten_stack_get_current();var __abort_js=()=>abort("");var readEmAsmArgsArray=[];var readEmAsmArgs=(sigPtr,buf)=>{readEmAsmArgsArray.length=0;var ch;while(ch=HEAPU8[sigPtr++]){var wide=ch!=105;wide&=ch!=112;buf+=wide&&buf%8?4:0;readEmAsmArgsArray.push(ch==112?HEAPU32[buf>>2]:ch==106?HEAP64[buf>>3]:ch==105?HEAP32[buf>>2]:HEAPF64[buf>>3]);buf+=wide?8:4}return readEmAsmArgsArray};var runEmAsmFunction=(code,sigPtr,argbuf)=>{var args=readEmAsmArgs(sigPtr,argbuf);return ASM_CONSTS[code](...args)};var _emscripten_asm_const_int=(code,sigPtr,argbuf)=>runEmAsmFunction(code,sigPtr,argbuf);var _emscripten_set_main_loop_timing=(mode,value)=>{MainLoop.timingMode=mode;MainLoop.timingValue=value;if(!MainLoop.func){return 1}if(!MainLoop.running){MainLoop.running=true}if(mode==0){MainLoop.scheduler=function MainLoop_scheduler_setTimeout(){var timeUntilNextTick=Math.max(0,MainLoop.tickStartTime+value-_emscripten_get_now())|0;setTimeout(MainLoop.runner,timeUntilNextTick)};MainLoop.method="timeout"}else if(mode==1){MainLoop.scheduler=function MainLoop_scheduler_rAF(){MainLoop.requestAnimationFrame(MainLoop.runner)};MainLoop.method="rAF"}else if(mode==2){if(typeof MainLoop.setImmediate=="undefined"){if(typeof setImmediate=="undefined"){var setImmediates=[];var emscriptenMainLoopMessageId="setimmediate";var MainLoop_setImmediate_messageHandler=event=>{if(event.data===emscriptenMainLoopMessageId||event.data.target===emscriptenMainLoopMessageId){event.stopPropagation();setImmediates.shift()()}};addEventListener("message",MainLoop_setImmediate_messageHandler,true);MainLoop.setImmediate=func=>{setImmediates.push(func);if(ENVIRONMENT_IS_WORKER){Module["setImmediates"]??=[];Module["setImmediates"].push(func);postMessage({target:emscriptenMainLoopMessageId})}else postMessage(emscriptenMainLoopMessageId,"*")}}else{MainLoop.setImmediate=setImmediate}}MainLoop.scheduler=function MainLoop_scheduler_setImmediate(){MainLoop.setImmediate(MainLoop.runner)};MainLoop.method="immediate"}return 0};var _emscripten_get_now=()=>performance.now();var runtimeKeepaliveCounter=0;var keepRuntimeAlive=()=>noExitRuntime||runtimeKeepaliveCounter>0;var _proc_exit=code=>{EXITSTATUS=code;if(!keepRuntimeAlive()){Module["onExit"]?.(code);ABORT=true}quit_(code,new ExitStatus(code))};var exitJS=(status,implicit)=>{EXITSTATUS=status;_proc_exit(status)};var _exit=exitJS;var handleException=e=>{if(e instanceof ExitStatus||e=="unwind"){return EXITSTATUS}quit_(1,e)};var maybeExit=()=>{if(!keepRuntimeAlive()){try{_exit(EXITSTATUS)}catch(e){handleException(e)}}};var setMainLoop=(iterFunc,fps,simulateInfiniteLoop,arg,noSetTiming)=>{MainLoop.func=iterFunc;MainLoop.arg=arg;var thisMainLoopId=MainLoop.currentlyRunningMainloop;function checkIsRunning(){if(thisMainLoopId<MainLoop.currentlyRunningMainloop){maybeExit();return false}return true}MainLoop.running=false;MainLoop.runner=function MainLoop_runner(){if(ABORT)return;if(MainLoop.queue.length>0){var start=Date.now();var blocker=MainLoop.queue.shift();blocker.func(blocker.arg);if(MainLoop.remainingBlockers){var remaining=MainLoop.remainingBlockers;var next=remaining%1==0?remaining-1:Math.floor(remaining);if(blocker.counted){MainLoop.remainingBlockers=next}else{next=next+.5;MainLoop.remainingBlockers=(8*remaining+next)/9}}MainLoop.updateStatus();if(!checkIsRunning())return;setTimeout(MainLoop.runner,0);return}if(!checkIsRunning())return;MainLoop.currentFrameNumber=MainLoop.currentFrameNumber+1|0;if(MainLoop.timingMode==1&&MainLoop.timingValue>1&&MainLoop.currentFrameNumber%MainLoop.timingValue!=0){MainLoop.scheduler();return}else if(MainLoop.timingMode==0){MainLoop.tickStartTime=_emscripten_get_now()}MainLoop.runIter(iterFunc);if(!checkIsRunning())return;MainLoop.scheduler()};if(!noSetTiming){if(fps>0){_emscripten_set_main_loop_timing(0,1e3/fps)}else{_emscripten_set_main_loop_timing(1,1)}MainLoop.scheduler()}if(simulateInfiniteLoop){throw"unwind"}};var callUserCallback=func=>{if(ABORT){return}try{func();maybeExit()}catch(e){handleException(e)}};var MainLoop={running:false,scheduler:null,method:"",currentlyRunningMainloop:0,func:null,arg:0,timingMode:0,timingValue:0,currentFrameNumber:0,queue:[],preMainLoop:[],postMainLoop:[],pause(){MainLoop.scheduler=null;MainLoop.currentlyRunningMainloop++},resume(){MainLoop.currentlyRunningMainloop++;var timingMode=MainLoop.timingMode;var timingValue=MainLoop.timingValue;var func=MainLoop.func;MainLoop.func=null;setMainLoop(func,0,false,MainLoop.arg,true);_emscripten_set_main_loop_timing(timingMode,timingValue);MainLoop.scheduler()},updateStatus(){if(Module["setStatus"]){var message=Module["statusMessage"]||"Please wait...";var remaining=MainLoop.remainingBlockers??0;var expected=MainLoop.expectedBlockers??0;if(remaining){if(remaining<expected){Module["setStatus"](`{message} ({expected - remaining}/{expected})`)}else{Module["setStatus"](message)}}else{Module["setStatus"]("")}}},init(){Module["preMainLoop"]&&MainLoop.preMainLoop.push(Module["preMainLoop"]);Module["postMainLoop"]&&MainLoop.postMainLoop.push(Module["postMainLoop"])},runIter(func){if(ABORT)return;for(var pre of MainLoop.preMainLoop){if(pre()===false){return}}callUserCallback(func);for(var post of MainLoop.postMainLoop){post()}},nextRAF:0,fakeRequestAnimationFrame(func){var now=Date.now();if(MainLoop.nextRAF===0){MainLoop.nextRAF=now+1e3/60}else{while(now+2>=MainLoop.nextRAF){MainLoop.nextRAF+=1e3/60}}var delay=Math.max(MainLoop.nextRAF-now,0);setTimeout(func,delay)},requestAnimationFrame(func){if(typeof requestAnimationFrame=="function"){requestAnimationFrame(func);return}var RAF=MainLoop.fakeRequestAnimationFrame;RAF(func)}};var _emscripten_cancel_main_loop=()=>{MainLoop.pause();MainLoop.func=null};var abortOnCannotGrowMemory=requestedSize=>{abort("OOM")};var _emscripten_resize_heap=requestedSize=>{var oldSize=HEAPU8.length;requestedSize>>>=0;abortOnCannotGrowMemory(requestedSize)};var onExits=[];var JSEvents={memcpy(target,src,size){HEAP8.set(HEAP8.subarray(src,src+size),target)},removeAllEventListeners(){while(JSEvents.eventHandlers.length){JSEvents._removeHandler(JSEvents.eventHandlers.length-1)}JSEvents.deferredCalls=[]},inEventHandler:0,deferredCalls:[],deferCall(targetFunction,precedence,argsList){function arraysHaveEqualContent(arrA,arrB){if(arrA.length!=arrB.length)return false;for(var i in arrA){if(arrA[i]!=arrB[i])return false}return true}for(var call of JSEvents.deferredCalls){if(call.targetFunction==targetFunction&&arraysHaveEqualContent(call.argsList,argsList)){return}}JSEvents.deferredCalls.push({targetFunction,precedence,argsList});JSEvents.deferredCalls.sort((x,y)=>x.precedence<y.precedence)},removeDeferredCalls(targetFunction){JSEvents.deferredCalls=JSEvents.deferredCalls.filter(call=>call.targetFunction!=targetFunction)},canPerformEventHandlerRequests(){if(navigator.userActivation){return navigator.userActivation.isActive}return JSEvents.inEventHandler&&JSEvents.currentEventHandler.allowsDeferredCalls},runDeferredCalls(){if(!JSEvents.canPerformEventHandlerRequests()){return}var deferredCalls=JSEvents.deferredCalls;JSEvents.deferredCalls=[];for(var call of deferredCalls){call.targetFunction(...call.argsList)}},eventHandlers:[],removeAllHandlersOnTarget:(target,eventTypeString)=>{for(var i=0;i<JSEvents.eventHandlers.length;++i){if(JSEvents.eventHandlers[i].target==target&&(!eventTypeString||eventTypeString==JSEvents.eventHandlers[i].eventTypeString)){JSEvents._removeHandler(i--)}}},_removeHandler(i){var h=JSEvents.eventHandlers[i];h.target.removeEventListener(h.eventTypeString,h.eventListenerFunc,h.useCapture);JSEvents.eventHandlers.splice(i,1)},registerOrRemoveHandler(eventHandler){if(!eventHandler.target){return-4}if(eventHandler.callbackfunc){eventHandler.eventListenerFunc=function(event){++JSEvents.inEventHandler;JSEvents.currentEventHandler=eventHandler;JSEvents.runDeferredCalls();eventHandler.handlerFunc(event);JSEvents.runDeferredCalls();--JSEvents.inEventHandler};eventHandler.target.addEventListener(eventHandler.eventTypeString,eventHandler.eventListenerFunc,eventHandler.useCapture);JSEvents.eventHandlers.push(eventHandler)}else{for(var i=0;i<JSEvents.eventHandlers.length;++i){if(JSEvents.eventHandlers[i].target==eventHandler.target&&JSEvents.eventHandlers[i].eventTypeString==eventHandler.eventTypeString){JSEvents._removeHandler(i--)}}}return 0},getNodeNameForTarget(target){if(!target)return"";if(target==window)return"#window";if(target==screen)return"#screen";return target?.nodeName||""},fullscreenEnabled(){return document.fullscreenEnabled||document.webkitFullscreenEnabled}};var UTF8Decoder=typeof TextDecoder!="undefined"?new TextDecoder:undefined;var UTF8ArrayToString=(heapOrArray,idx=0,maxBytesToRead=NaN)=>{var endIdx=idx+maxBytesToRead;var endPtr=idx;while(heapOrArray[endPtr]&&!(endPtr>=endIdx))++endPtr;if(endPtr-idx>16&&heapOrArray.buffer&&UTF8Decoder){return UTF8Decoder.decode(heapOrArray.subarray(idx,endPtr))}var str="";while(idx<endPtr){var u0=heapOrArray[idx++];if(!(u0&128)){str+=String.fromCharCode(u0);continue}var u1=heapOrArray[idx++]&63;if((u0&224)==192){str+=String.fromCharCode((u0&31)<<6|u1);continue}var u2=heapOrArray[idx++]&63;if((u0&240)==224){u0=(u0&15)<<12|u1<<6|u2}else{u0=(u0&7)<<18|u1<<12|u2<<6|heapOrArray[idx++]&63}if(u0<65536){str+=String.fromCharCode(u0)}else{var ch=u0-65536;str+=String.fromCharCode(55296|ch>>10,56320|ch&1023)}}return str};var UTF8ToString=(ptr,maxBytesToRead)=>ptr?UTF8ArrayToString(HEAPU8,ptr,maxBytesToRead):"";var maybeCStringToJsString=cString=>cString>2?UTF8ToString(cString):cString;var specialHTMLTargets=[0,typeof document!="undefined"?document:0,typeof window!="undefined"?window:0];var findEventTarget=target=>{target=maybeCStringToJsString(target);var domElement=specialHTMLTargets[target]||(typeof document!="undefined"?document.querySelector(target):null);return domElement};var stringToUTF8Array=(str,heap,outIdx,maxBytesToWrite)=>{if(!(maxBytesToWrite>0))return 0;var startIdx=outIdx;var endIdx=outIdx+maxBytesToWrite-1;for(var i=0;i<str.length;++i){var u=str.charCodeAt(i);if(u>=55296&&u<=57343){var u1=str.charCodeAt(++i);u=65536+((u&1023)<<10)|u1&1023}if(u<=127){if(outIdx>=endIdx)break;heap[outIdx++]=u}else if(u<=2047){if(outIdx+1>=endIdx)break;heap[outIdx++]=192|u>>6;heap[outIdx++]=128|u&63}else if(u<=65535){if(outIdx+2>=endIdx)break;heap[outIdx++]=224|u>>12;heap[outIdx++]=128|u>>6&63;heap[outIdx++]=128|u&63}else{if(outIdx+3>=endIdx)break;heap[outIdx++]=240|u>>18;heap[outIdx++]=128|u>>12&63;heap[outIdx++]=128|u>>6&63;heap[outIdx++]=128|u&63}}heap[outIdx]=0;return outIdx-startIdx};var stringToUTF8=(str,outPtr,maxBytesToWrite)=>stringToUTF8Array(str,HEAPU8,outPtr,maxBytesToWrite);var wasmTableMirror=[];var wasmTable;var getWasmTableEntry=funcPtr=>{var func=wasmTableMirror[funcPtr];if(!func){if(funcPtr>=wasmTableMirror.length)wasmTableMirror.length=funcPtr+1;wasmTableMirror[funcPtr]=func=wasmTable.get(funcPtr)}return func};var registerKeyEventCallback=(target,userData,useCapture,callbackfunc,eventTypeId,eventTypeString,targetThread)=>{JSEvents.keyEvent||=_malloc(160);var keyEventHandlerFunc=e=>{var keyEventData=JSEvents.keyEvent;HEAPF64[keyEventData>>3]=e.timeStamp;var idx=keyEventData>>2;HEAP32[idx+2]=e.location;HEAP8[keyEventData+12]=e.ctrlKey;HEAP8[keyEventData+13]=e.shiftKey;HEAP8[keyEventData+14]=e.altKey;HEAP8[keyEventData+15]=e.metaKey;HEAP8[keyEventData+16]=e.repeat;HEAP32[idx+5]=e.charCode;HEAP32[idx+6]=e.keyCode;HEAP32[idx+7]=e.which;stringToUTF8(e.key||"",keyEventData+32,32);stringToUTF8(e.code||"",keyEventData+64,32);stringToUTF8(e.char||"",keyEventData+96,32);stringToUTF8(e.locale||"",keyEventData+128,32);if(getWasmTableEntry(callbackfunc)(eventTypeId,keyEventData,userData))e.preventDefault()};var eventHandler={target:findEventTarget(target),eventTypeString,callbackfunc,handlerFunc:keyEventHandlerFunc,useCapture};return JSEvents.registerOrRemoveHandler(eventHandler)};var _emscripten_set_keydown_callback_on_thread=(target,userData,useCapture,callbackfunc,targetThread)=>registerKeyEventCallback(target,userData,useCapture,callbackfunc,2,"keydown",targetThread);var _emscripten_set_main_loop=(func,fps,simulateInfiniteLoop)=>{var iterFunc=getWasmTableEntry(func);setMainLoop(iterFunc,fps,simulateInfiniteLoop)};var getCFunc=ident=>{var func=Module["_"+ident];return func};var writeArrayToMemory=(array,buffer)=>{HEAP8.set(array,buffer)};var lengthBytesUTF8=str=>{var len=0;for(var i=0;i<str.length;++i){var c=str.charCodeAt(i);if(c<=127){len++}else if(c<=2047){len+=2}else if(c>=55296&&c<=57343){len+=4;++i}else{len+=3}}return len};var stackAlloc=sz=>__emscripten_stack_alloc(sz);var stringToUTF8OnStack=str=>{var size=lengthBytesUTF8(str)+1;var ret=stackAlloc(size);stringToUTF8(str,ret,size);return ret};var ccall=(ident,returnType,argTypes,args,opts)=>{var toC={string:str=>{var ret=0;if(str!==null&&str!==undefined&&str!==0){ret=stringToUTF8OnStack(str)}return ret},array:arr=>{var ret=stackAlloc(arr.length);writeArrayToMemory(arr,ret);return ret}};function convertReturnValue(ret){if(returnType==="string"){return UTF8ToString(ret)}if(returnType==="boolean")return Boolean(ret);return ret}var func=getCFunc(ident);var cArgs=[];var stack=0;if(args){for(var i=0;i<args.length;i++){var converter=toC[argTypes[i]];if(converter){if(stack===0)stack=stackSave();cArgs[i]=converter(args[i])}else{cArgs[i]=args[i]}}}var ret=func(...cArgs);function onDone(ret){if(stack!==0)stackRestore(stack);return convertReturnValue(ret)}ret=onDone(ret);return ret};var cwrap=(ident,returnType,argTypes,opts)=>{var numericArgs=!argTypes||argTypes.every(type=>type==="number"||type==="boolean");var numericRet=returnType!=="string";if(numericRet&&numericArgs&&!opts){return getCFunc(ident)}return(...args)=>ccall(ident,returnType,argTypes,args,opts)};Module["requestAnimationFrame"]=MainLoop.requestAnimationFrame;Module["pauseMainLoop"]=MainLoop.pause;Module["resumeMainLoop"]=MainLoop.resume;MainLoop.init();var wasmImports={_abort_js:__abort_js,clearCanvas,drawRect,drawText,emscripten_asm_const_int:_emscripten_asm_const_int,emscripten_cancel_main_loop:_emscripten_cancel_main_loop,emscripten_resize_heap:_emscripten_resize_heap,emscripten_set_keydown_callback_on_thread:_emscripten_set_keydown_callback_on_thread,emscripten_set_main_loop:_emscripten_set_main_loop};var wasmExports;createWasm();var ___wasm_call_ctors=()=>(___wasm_call_ctors=wasmExports["__wasm_call_ctors"])();var _update_remote_state=Module["_update_remote_state"]=(a0,a1,a2,a3,a4,a5)=>(_update_remote_state=Module["_update_remote_state"]=wasmExports["update_remote_state"])(a0,a1,a2,a3,a4,a5);var _set_remote_paddle=Module["_set_remote_paddle"]=a0=>(_set_remote_paddle=Module["_set_remote_paddle"]=wasmExports["set_remote_paddle"])(a0);var _get_remote_paddle=Module["_get_remote_paddle"]=()=>(_get_remote_paddle=Module["_get_remote_paddle"]=wasmExports["get_remote_paddle"])();var _set_role=Module["_set_role"]=a0=>(_set_role=Module["_set_role"]=wasmExports["set_role"])(a0);var _start_game=Module["_start_game"]=()=>(_start_game=Module["_start_game"]=wasmExports["start_game"])();var _malloc=a0=>(_malloc=wasmExports["malloc"])(a0);var __emscripten_stack_restore=a0=>(__emscripten_stack_restore=wasmExports["_emscripten_stack_restore"])(a0);var __emscripten_stack_alloc=a0=>(__emscripten_stack_alloc=wasmExports["_emscripten_stack_alloc"])(a0);var _emscripten_stack_get_current=()=>(_emscripten_stack_get_current=wasmExports["emscripten_stack_get_current"])();Module["ccall"]=ccall;Module["cwrap"]=cwrap;function run(){if(runDependencies>0){dependenciesFulfilled=run;return}preRun();if(runDependencies>0){dependenciesFulfilled=run;return}function doRun(){Module["calledRun"]=true;if(ABORT)return;initRuntime();Module["onRuntimeInitialized"]?.();postRun()}if(Module["setStatus"]){Module["setStatus"]("Running...");setTimeout(()=>{setTimeout(()=>Module["setStatus"](""),1);doRun()},1)}else{doRun()}}if(Module["preInit"]){if(typeof Module["preInit"]=="function")Module["preInit"]=[Module["preInit"]];while(Module["preInit"].length>0){Module["preInit"].pop()()}}run();
