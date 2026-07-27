export interface Guild {
	_id: string;
	name: string;
	icon: Asset;
	features?: string[];
	type?: "Community" | "DiscoverableCommunity" | "Partnered" | "Verified";
	premiumTier?: number;
	premiumSubscriptionCount?: number;
	isBoosted?: boolean;
	serverGuide?: ServerGuide | null;
	onboarding?: GuildOnboarding | null;
	roles?: Role[];
	specialChannelIds?: {
		rules?: string | null;
		publicUpdates?: string | null;
		system?: string | null;
		safetyAlerts?: string | null;
	};
	msg_count: number;
}

export interface Category {
	_id: string;
	name: string;
	channels: Channel[];
	msg_count: number;
	position?: number | null;
	categoryOrder?: number | null;
	isHeaderless?: boolean;
}

export interface Asset {
	_id: string;
	originalPath: string;
	canonicalUrl?: string;
	localPath: string;
	remotePath: string;
	path: string;
	extension: string;
	type: "image" | "video" | "audio" | "unknown";
	width: number;
	height: number;
	sizeBytes: number;
	filenameWithHash: string;
	filenameWithoutHash: string;
	mediaId?: number;
	fileId?: number;
	thumbnailMediaId?: number;
	thumbnailFileId?: number;
	cachedThumbnailFileId?: number;
	thumbnailUrl?: string;
	originalUrl?: string;
	discordUrl?: string;
	/** Legacy archive metadata retained for old exports. */
	mediaKey?: string;
	isOffline?: boolean;
	colorDominant: null | [number, number, number];
	colorPalette: null | [number, number, number][];
}

export interface Channel {
	_id: string;
	channelType?: "VoiceChannel" | "TextChannel" | "Forums" | "Threads";
	type: "GuildTextChat" | "DirectTextChat" | "GuildVoiceChat" | "DirectGroupTextChat" | "GuildCategory" | "GuildNews" | "GuildNewsThread" | "GuildPublicThread" | "GuildPrivateThread" | "GuildStageVoice" | "GuildDirectory" | "GuildForum" | "GuildMedia" | "GuildServerGuide" | "GuildChannelsAndRoles";
	typeLabel?: string;
	categoryId: string;
	category: string;
	name: string;
	position?: number | null;
	categoryPosition?: number | null;
	sidebarOrder?: number | null;
	categoryOrder?: number | null;
	channelOrder?: number | null;
	isHidden?: boolean;
	topic: string | null;
	lastMessageId?: string | null;
	guildId: string;
	msg_count: number;
	threads: Channel[];
	isRulesChannel?: boolean;
	isPublicUpdatesChannel?: boolean;
	isSystemChannel?: boolean;
	availableTags?: ForumTag[];
	appliedTags?: string[];
	flags?: number | null;
	isPinned?: boolean;
	requiresTag?: boolean;
	defaultForumLayout?: number | null;
	defaultSortOrder?: number | null;
	defaultReactionEmoji?: {
		emojiId?: string | null;
		emojiName?: string | null;
	} | null;
	ownerId?: string | null;
	rateLimitPerUserSeconds?: number | null;
	defaultAutoArchiveDurationMinutes?: number | null;
	defaultThreadRateLimitPerUserSeconds?: number | null;
	isArchived?: boolean | null;
	isLocked?: boolean | null;
	isPrivate?: boolean | null;
	isInvitable?: boolean | null;
	autoArchiveDurationMinutes?: number | null;
	archiveStateChangedAt?: string | null;
	createdAt?: string | null;
	isDeleted?: boolean;
	deletedAt?: string | null;
	lastSeenActiveAt?: string | null;
	reportedMessageCount?: number | null;
	totalMessageSent?: number | null;
	memberCount?: number | null;
	capturedMessageCount?: number;
	starterMessageId?: string | null;
	starterContent?: string | null;
	starterAuthorId?: string | null;
	starterAuthorName?: string | null;
	starterTimestamp?: string | null;
	starterThumbnailUrl?: string | null;
	/** Legacy live-export metadata retained for older archives. */
	archivedAt?: string | null;
}

export interface ForumTag {
	id: string | null;
	name: string;
	isModerated: boolean;
	emojiId?: string | null;
	emojiName?: string | null;
}

export interface Role {
	_id: string;
	name: string;
	color: null | string;
	position: number;
	isHoisted?: boolean | null;
	isManaged?: boolean | null;
	isMentionable?: boolean | null;
	iconHash?: string | null;
	unicodeEmoji?: string | null;
}

export interface ServerGuide {
	enabled: boolean;
	welcomeMessage?: string | null;
	authorIds: string[];
	actions: ServerGuideEntry[];
	resourceChannels: ServerGuideEntry[];
}

export interface ServerGuideEntry {
	channelId?: string | null;
	actionType?: number | null;
	title?: string | null;
	description?: string | null;
	completed?: boolean;
}

export interface GuildOnboarding {
	enabled: boolean;
	mode?: number | null;
	belowRequirements?: boolean;
	defaultChannelIds: string[];
	selectedOptionIds: string[];
	prompts: GuildOnboardingPrompt[];
}

export interface GuildOnboardingPrompt {
	id: string;
	type?: number;
	title: string;
	single_select?: boolean;
	required?: boolean;
	in_onboarding?: boolean;
	options: GuildOnboardingOption[];
}

export interface GuildOnboardingOption {
	id: string;
	title: string;
	description?: string | null;
	role_ids?: string[];
	channel_ids?: string[];
	emoji?: {
		id?: string | null;
		name?: string | null;
		animated?: boolean;
	} | null;
}

export interface Author {
	name: string;
	nickname: string;
	color: string;
	isBot: boolean;
	avatar: Asset;
	roles?: Role[];
	discriminator?: string;
	msgCount?: number;
	_id: string;
}

export interface Sticker {
	name: string;
	format: "Png" | "Apng" | "Lottie";
	_id: string;
	source: Asset;
}

export interface Emoji {
	_id: string;
	name: string;
	isAnimated: boolean;
	image: Asset;
	source: "default" | "custom";
	guildId: string | null;
}

export interface ReactionUser {
	name: string;
	nickname: string;
	isBot: boolean;
	avatar: Asset;
	_id: string;
}

export interface Reaction {
	emoji: Emoji;
	count: number;
	users?: ReactionUser[];
}

export interface Mention {
	name: string;
	discriminator: string;
	nickname: string;
	isBot: boolean;
	_id: string;
}

export interface Embed {
	type?: string;
	title: string;
	url: string;
	timestamp: string | null;
	description: string;
	thumbnail: Asset;
	images: Asset[];
	image?: Asset;
	video?: Asset;
	inlineEmojis?: any[];
	fields: {
		name: string;
		value: string;
		isInline: boolean;
	}[];
	color?: string;
	author?: {
		name: string;
		url: string;
		icon?: Asset;
	};
	footer?: {
		text: string;
		icon: Asset;
	};
	mediaContext?: EmbedMediaContext[];
}

export interface EmbedMediaContext {
	id: number;
	role: string;
	ordinal: number;
	originalUrl?: string;
	canonicalUrl?: string;
	discordUrl?: string;
	mediaId?: number;
	fileId?: number;
	thumbnailMediaId?: number;
	thumbnailFileId?: number;
	cachedThumbnailFileId?: number;
	providerName?: string;
	title?: string;
	description?: string;
	discordMediaId?: string;
	declaredContentType?: string;
	width?: number;
	height?: number;
	source?: string;
}

export interface InvitePreview {
	code: string;
	guildId?: string | null;
	name?: string | null;
	icon?: Asset | null;
	banner?: Asset | null;
	onlineCount?: number | null;
	memberCount?: number | null;
	createdAt?: string | null;
	description?: string | null;
}

export interface PollAnswer {
	answer_id?: string | number;
	id?: string | number;
	text?: string;
	poll_media?: {
		text?: string;
		emoji?: {
			id?: string | number;
			name?: string;
		};
	};
	emoji?: {
		id?: string | number;
		name?: string;
	};
}

export interface PollResultsAnswerCount {
	answer_id?: string | number;
	id?: string | number;
	count?: number;
	votes?: number;
}

export interface Poll {
	question?: {
		text?: string;
	};
	answers?: PollAnswer[];
	results?: {
		total_votes?: number;
		answer_counts?: PollResultsAnswerCount[];
	};
}

export interface MessageContent {
	timestamp: string;
	content: string;
}


export interface Message {
	_id: string;
	type: "Default" | "RecipientAdd" | "RecipientRemove" | "Call" | "ChannelNameChange" | "ChannelIconChange" | "ChannelPinnedMessage" | "GuildMemberJoin" | "ThreadCreated" | "Reply" | "24" | "46";
	timestamp: string;
	timestampEdited: string | null;
	callEndedTimestamp: string | null;
	isPinned: boolean;
	isDeleted?: boolean;
	content: MessageContent[];
	author: Author;
	stickers: Sticker[] | null;
	reactions: Reaction[] | null;
	emotes: Reaction[] | null;   // emotes in the message
	mentions: Mention[] | null;
	attachments: Asset[] | null;
	embeds: Embed[] | null;
	invites?: InvitePreview[] | null;
	reference: {
		type?: string;
		messageId: string;
		channelId: string;
		guildId: string | null;
		isDeleted?: boolean | null;
		message?: Message | null;
	} | null;
	referencedMessage?: Message | null;
	poll?: Poll | null;
	components?: any[] | null;
	inlineEmojis?: any[] | null;
	guildId: string;
	channelId: string;
	channelName: string;
	thread?: Channel;            // if message type is "ThreadCreated"
}

export interface MessageIdLoad {
	_id: string;
	loaded: boolean;
}
