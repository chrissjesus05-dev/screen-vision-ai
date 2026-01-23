import { formatMarkdown } from '../services/utils';
import './ChatMessage.css';

function ChatMessage({ message }) {
    const { role, content } = message;

    const icons = {
        user: '👤',
        assistant: '🔷',
        system: '💡'
    };

    const formattedContent = role === 'assistant'
        ? formatMarkdown(content)
        : content;

    return (
        <div className={`message ${role}-message`}>
            {role !== 'user' && (
                <div className="message-icon">
                    {icons[role]}
                </div>
            )}
            <div
                className="message-content"
                dangerouslySetInnerHTML={
                    role === 'assistant'
                        ? { __html: formattedContent }
                        : undefined
                }
            >
                {role !== 'assistant' && <p>{content}</p>}
            </div>
            {role === 'user' && (
                <div className="message-icon">
                    {icons[role]}
                </div>
            )}
        </div>
    );
}

export default ChatMessage;
