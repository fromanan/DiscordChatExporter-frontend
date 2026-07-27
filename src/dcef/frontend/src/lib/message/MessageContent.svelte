<script lang="ts">
    import Message from "./Message.svelte";
    import MessageMarkdown from "./MessageMarkdown.svelte";

    export let message: Message[]
    export let content: string | undefined = undefined
</script>

<MessageMarkdown
    content={content ?? message.content[0].content}
    emotes={message?.emotes || []}
    mentions={message?.mentions || []}
    roles={message?.roles || []}
    channels={message?.channels || []}
    timestampEdited={message.timestampEdited}
    isDeleted={message.isDeleted}
/>
