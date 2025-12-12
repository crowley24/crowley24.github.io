// FULL UPDATED CARDIFY TRAILER WITH MUTE/UNMUTE BUTTON (Variant B)
// ---------------------------------------------------------------
// NOTE: This file integrates the new mute/unmute button replacing the old
// .cardify-trailer__remote block, while preserving all original logic.
// ---------------------------------------------------------------

(function(){

    function CardifyTrailer(object){
        this.object = object;
        this.html = null;
        this.player = null;
        this.visible = false;
        this.mute_button = null;
    }

    CardifyTrailer.prototype.create = function(){
        const _this = this;

        // Main HTML container
        this.html = $(`
            <div class="cardify-trailer">
                <div class="cardify-trailer__player"></div>
            </div>
        `);

        // Insert trailer into activity layout
        this.object.activity.render().find('.full-start__body').before(this.html);

        // Create Player instance
        this.player = new CardifyTrailerPlayer({ element: this.html.find('.cardify-trailer__player') });

        this.player.listener.follow('play', function(){
            _this.show();
            _this.showMuteButton();
        });

        this.player.listener.follow('ended', function(){
            _this.hideMuteButton();
        });

        this.player.listener.follow('error', function(){
            _this.hideMuteButton();
        });
    };

    CardifyTrailer.prototype.start = function(){
        const _this = this;

        // -----------------------------
        // CREATE NEW MUTE BUTTON (Variant B)
        // -----------------------------
        this.mute_button = $(`
            <div class="full-start__button selector button--mute cardify-mute-button hide">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    ${this.player.getSoundOffIcon()}
                </svg>
                <span>${Lampa.Lang.translate('cardify_enable_sound')}</span>
            </div>
        `);

        // Insert into same button-line as (дивитись, вибране, реакції)
        this.object.activity.render().find('.full-start__buttons-line')
            .append(this.mute_button);

        // Attach to Player
        this.player.mute_button = this.mute_button;

        // Click / Enter event
        this.mute_button.on('hover:enter', function(){
            _this.player.toggleMute();
        });
    };

    CardifyTrailer.prototype.showMuteButton = function(){
        if (this.mute_button) this.mute_button.removeClass('hide');
    };

    CardifyTrailer.prototype.hideMuteButton = function(){
        if (this.mute_button) this.mute_button.addClass('hide');
    };

    CardifyTrailer.prototype.show = function(){
        if (!this.visible){
            this.visible = true;
            this.html.addClass('visible');
        }
    };

    // --------------------------------------------------
    // PLAYER CLASS
    // --------------------------------------------------

    function CardifyTrailerPlayer(params){
        this.element = params.element;
        this.youtube = null;
        this.listener = Lampa.Subscribe();
        this.isMuted = true;
        this.mute_button = null;

        this.load();
    }

    CardifyTrailerPlayer.prototype.load = function(){
        const _this = this;

        this.youtube = new Lampa.PlayerYoutube({});

        this.youtube.listener.follow('play', function(){
            _this.listener.send('play');
        });

        this.youtube.listener.follow('ended', function(){
            _this.listener.send('ended');
        });

        this.youtube.listener.follow('error', function(){
            _this.listener.send('error');
        });

        this.youtube.render(this.element);

        // Always start muted
        this.youtube.mute();
    };

    // --------------------------------------------------
    // MUTE/UNMUTE TOGGLER
    // --------------------------------------------------

    CardifyTrailerPlayer.prototype.toggleMute = function(){
        try {
            if (this.isMuted) {
                this.youtube.unMute();
                this.isMuted = false;
                this.updateMuteButton(false);
            } else {
                this.youtube.mute();
                this.isMuted = true;
                this.updateMuteButton(true);
            }

            window.cardify_fist_unmute = true;
        } catch (e) {}
    };

    CardifyTrailerPlayer.prototype.updateMuteButton = function(muted){
        if (!this.mute_button) return;

        if (muted) {
            this.mute_button.find('svg').html(this.getSoundOffIcon());
            this.mute_button.find('span').text(Lampa.Lang.translate('cardify_enable_sound'));
        } else {
            this.mute_button.find('svg').html(this.getSoundOnIcon());
            this.mute_button.find('span').text(Lampa.Lang.translate('cardify_disable_sound'));
        }
    };

    // --------------------------------------------------
    // ICONS
    // --------------------------------------------------

    CardifyTrailerPlayer.prototype.getSoundOffIcon = function(){
        return `
            <path d="M13 4L7 9H3V19H7L13 24V4Z" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M19 8C20.5 9.5 21 12 21 14C21 16 20.5 18.5 19 20" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M17 10C17.8 11.2 18 12.5 18 14C18 15.5 17.8 16.8 17 18" stroke="currentColor" stroke-width="2" fill="none"/>
        `;
    };

    CardifyTrailerPlayer.prototype.getSoundOnIcon = function(){
        return `
            <path d="M13 4L7 9H3V19H7L13 24V4Z" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M19 8L22 5" stroke="currentColor" stroke-width="2"/>
            <path d="M19 20L22 23" stroke="currentColor" stroke-width="2"/>
        `;
    };

    // --------------------------------------------------
    // EXPORT
    // --------------------------------------------------

    window.CardifyTrailer = CardifyTrailer;

})();
