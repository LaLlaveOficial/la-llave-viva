// One catalog for routing and the keyboard help. Never intercept text editing.
export const shortcutCatalog=[
 {id:'select',name:'Selección',shortcut:'V',key:'v'},
 {id:'blade',name:'Cuchilla',shortcut:'C',key:'c'},
 {id:'split',name:'Dividir en el cabezal',shortcut:'S',key:'s'},
 {id:'duplicate',name:'Duplicar clip',shortcut:'D',key:'d'},
 {id:'remove',name:'Eliminar clip',shortcut:'Supr / Retroceso',key:'delete'},
 {id:'snap',name:'Imán',shortcut:'M',key:'m'},
 {id:'fit',name:'Ajustar timeline',shortcut:'F',key:'f'},
 {id:'videoFadeIn',name:'Fundido de video · entrada',shortcut:'I',key:'i'},
 {id:'videoFadeOut',name:'Fundido de video · salida',shortcut:'O',key:'o'},
 {id:'audioFadeIn',name:'Fundido de audio · entrada',shortcut:'Shift+I',key:'i',shift:true},
 {id:'audioFadeOut',name:'Fundido de audio · salida',shortcut:'Shift+O',key:'o',shift:true},
 {id:'volume',name:'Volumen',shortcut:'G',key:'g'},
 {id:'videoTransition',name:'Disolución entre clips',shortcut:'T',key:'t'},
 {id:'audioTransition',name:'Fundido cruzado de audio',shortcut:'Shift+T',key:'t',shift:true},
 {id:'extractAudio',name:'Extraer audio del video',shortcut:'Shift+E',key:'e',shift:true},
 {id:'subtitle',name:'Añadir subtítulo',shortcut:'Shift+L',key:'l',shift:true},
 {id:'keyframe',name:'Guardar keyframe',shortcut:'Shift+K',key:'k',shift:true},
 {id:'play',name:'Reproducir / pausar',shortcut:'Espacio',key:' '},
 {id:'undo',name:'Deshacer',shortcut:'Ctrl/⌘+Z',key:'z',modifier:true},
 {id:'redo',name:'Rehacer',shortcut:'Ctrl/⌘+Shift+Z',key:'z',modifier:true,shift:true},
 {id:'redo',name:'Rehacer',shortcut:'Ctrl/⌘+Y',key:'y',modifier:true},
 {id:'keyboard',name:'Mostrar atajos',shortcut:'Shift+/',key:'/',shift:true},
 {id:'close',name:'Cerrar ayuda / cancelar exportación',shortcut:'Esc',key:'escape'}
];
export function resolveShortcut(event){
 if(event.altKey||event.repeat||event.isComposing||event.target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])'))return null;
 let key=(event.key||'').toLowerCase();
 if(['del','supr','backspace'].includes(key)||event.code==='Delete')key='delete';
 if(key==='?'||event.code==='Slash')key='/';
 return shortcutCatalog.find(item=>item.key===key&&Boolean(item.shift)===Boolean(event.shiftKey)&&Boolean(item.modifier)===Boolean(event.ctrlKey||event.metaKey))?.id||null;
}
