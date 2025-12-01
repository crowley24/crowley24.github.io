Lampa.Listener.follow('card_build',(event)=>{
    try {
        let card = event.card;
        let data = event.data;

        if(!card) return;

        let text = JSON.stringify(data).toLowerCase();

        let tags = [];

        if(text.includes("dolby vision") || text.includes("dovi") || text.includes("dv"))
            tags.push('dv');

        if(text.includes("hdr10+"))
            tags.push('hdr10plus');

        if(text.includes("hdr"))
            tags.push('hdr');

        if(text.includes("atmos"))
            tags.push('atmos');

        if(tags.length){
            let container = $(card).find('.card__quality');

            tags.forEach(t=>{
                container.append(`<div class="badge-${t}"></div>`);
            });
        }
    }
    catch(e){}
});

// ---------- СТИЛІ ----------
let style = `
<style>
.badge-dv,
.badge-hdr,
.badge-hdr10plus,
.badge-atmos{
    display:inline-flex;
    align-items:center;
    justify-content:center;
    padding:2px 6px;
    font-size:10px;
    font-weight:700;
    border-radius:4px;
    margin-left:4px;
    background:linear-gradient(145deg,#000,#1a1a1a);
    color:#fff;
    border:1px solid rgba(255,255,255,0.25);
    box-shadow:0 0 4px rgba(0,0,0,0.5);
}

/* DV */
.badge-dv::after{
    content:"DV";
    color:#8c4bff;
    font-weight:800;
}

/* HDR */
.badge-hdr::after{
    content:"HDR";
    color:#ffd644;
}

/* HDR10+ */
.badge-hdr10plus::after{
    content:"HDR10+";
    color:#ff7f2a;
}

/* ATMOS */
.badge-atmos::after{
    content:"ATMOS";
    color:#4ba3ff;
}
</style>
`;

$('head').append(style);
