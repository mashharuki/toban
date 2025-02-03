import { Box, Text, Flex, Input } from "@chakra-ui/react";
import { Hat } from "@hatsprotocol/sdk-v1-subgraph";
import { useParams } from "@remix-run/react";
import axios from "axios";
import { useAddressesByNames, useNamesByAddresses } from "hooks/useENS";
import { useTreeInfo } from "hooks/useHats";
import { useGetWorkspace } from "hooks/useWorkspace";
import { useEffect, useState, type FC, useCallback } from "react";
import { HatsDetailSchama } from "types/hats";
import { ipfs2https } from "utils/ipfs";
import { abbreviateAddress, isValidEthAddress } from "utils/wallet";
import { CommonButton } from "~/components/common/CommonButton";
import { CommonInput } from "~/components/common/CommonInput";
import { CommonTextArea } from "~/components/common/CommonTextarea";
import { UserIcon } from "~/components/icon/UserIcon";
import { WorkspaceIcon } from "~/components/icon/WorkspaceIcon";
import { PageHeader } from "~/components/PageHeader";

const SettingsSection: FC<{ children: React.ReactNode; headingText: string }> = ({
  children,
  headingText,
}) => (
  <Box mt={2} mb={12}>
    <Text fontSize="md" fontWeight="medium" color="gray.600">
      {headingText}
    </Text>
    {children}
  </Box>
);

const SettingsSubSection: FC<{ children: React.ReactNode; headingText: string }> = ({
  children,
  headingText,
}) => (
  <Box mt={3} mb={5}>
    <Text mb={3} fontSize="sm" fontWeight="medium" color="gray.600">
      {headingText}
    </Text>
    {children}
  </Box>
);

const InputWithActionButton: FC<{
  children: React.ReactNode;
  buttonText: string;
  color?: string;
  backgroundColor?: string;
}> = ({
  children,
  buttonText,
  color = "gray.800",
  backgroundColor = "yellow.400",
}) => (
  <Flex gap={2.5} mb={3.5}>
    {children}
    <Box>
      <CommonButton
        color={color}
        backgroundColor={backgroundColor}
      >
        {buttonText}
      </CommonButton>
    </Box>
  </Flex>
);

const InputAddressWithButton: FC<{
  placeholder?: string;
  inputAddress: string;
  setInputAddress: (address: string) => void;
  buttonText: string;
  color?: string;
  backgroundColor?: string;
}> = ({
  placeholder = "",
  inputAddress,
  setInputAddress,
  buttonText,
  color = "gray.800",
  backgroundColor = "yellow.400",
}) => (
  <InputWithActionButton buttonText={buttonText} color={color} backgroundColor={backgroundColor}>
    <CommonInput
      placeholder={placeholder}
      value={inputAddress}
      onChange={(e) => setInputAddress(e.target.value)}
    />
  </InputWithActionButton>
);

interface Account {
  name: string;
  address: string;
  [key: string]: unknown;
}
const RoleSubSection: FC<{
  addresses: string[];
  accounts: Account[];
  headingText: string;
  inputAddress: string;
  setInputAddress: (address: string) => void;
}> = ({ addresses, accounts, headingText, inputAddress, setInputAddress }) => {
  const { names } = useNamesByAddresses(addresses);

  return (
    <SettingsSubSection headingText={headingText}>
      <Box mb={8}>
        {accounts.map((account) => {
          const name = names.find(
            (name) => name[0]?.address === account.address,
          )?.[0];
          return (
            <InputWithActionButton key={account.address} buttonText="削除" backgroundColor="red.300">
              <Flex width="100%" alignItems="center" gap={2}>
                <UserIcon
                  size="40px"
                  userImageUrl={ipfs2https(name?.text_records?.avatar)}
                />
                <Box flexGrow={1}>
                  <Text textStyle="sm">{name?.name}</Text>
                  <Text textStyle="sm">
                    {abbreviateAddress(name?.address || "")}
                  </Text>
                </Box>
              </Flex>
            </InputWithActionButton>
          );
        })}
        <InputAddressWithButton
          placeholder="ユーザー名 or ウォレットアドレス"
          inputAddress={inputAddress}
          setInputAddress={setInputAddress}
          buttonText="追加"
        />
      </Box>
    </SettingsSubSection>
  );
};

const WorkspaceSettings: FC = () => {
  const { treeId } = useParams();
  const treeInfo = useTreeInfo(Number(treeId));
  const { fetchAddresses } = useAddressesByNames(undefined, true);
  const { data } = useGetWorkspace(treeId);
  const { fetchNames } = useNamesByAddresses();

  const [workspaceImgUrl, setWorkspaceImgUrl] = useState<string | undefined>(undefined);
  const [workspaceName, setWorkspaceName] = useState<string>("");
  const [workspaceDescription, setWorkspaceDescription] = useState<string>("");
  const [currentCreateHatAuthoritiesAddresses, setCurrentCreateHatAuthoritiesAddresses] = useState<string[]>([]);
  const [currentOperationAuthoritiesAddresses, setCurrentOperationAuthoritiesAddresses] = useState<string[]>([]);
  const [currentCreateHatAuthoritiesAccounts, setCurrentCreateHatAuthoritiesAccounts] = useState<Account[]>([]);
  const [currentOperationAuthoritiesAccounts, setCurrentOperationAuthoritiesAccounts] = useState<Account[]>([]);
  const [newCreateHatAuthority, setNewCreateHatAuthority] = useState<string>("");
  const [newOperationAuthority, setNewOperationAuthority] = useState<string>("");
  const [newCreateHatAuthorityAddress, setNewCreateHatAuthorityAddress] = useState<string | undefined>(undefined);
  const [newOperationAuthorityAddress, setNewOperationAuthorityAddress] = useState<string | undefined>(undefined);
  const [newOwner, setNewOwner] = useState<string>("");
  const [topHat, setTopHat] = useState<Hat | undefined>(undefined);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    const computedTopHat = treeInfo?.hats?.find((hat) => hat.levelAtLocalTree === 0);
    if (computedTopHat !== topHat) setTopHat(computedTopHat);
  }, [treeInfo]);

  useEffect(() => {
    const setInitialWorkspaceImgUrl = async () => {
      if (!topHat?.imageUri) return;
      const url = ipfs2https(topHat.imageUri);
      if (url !== workspaceImgUrl) setWorkspaceImgUrl(url);
    }
    setInitialWorkspaceImgUrl();
  }, [topHat]);

  useEffect(() => {
    const setInitialWorkspaceStates = async () => {
      if (!topHat?.details) return;
      const { data } = await axios.get<HatsDetailSchama>(
        ipfs2https(topHat.details) || "",
      );
      const name = data.data.name;
      const description = data.data.description;
      if (name !== workspaceName) setWorkspaceName(name);
      if (description !== workspaceDescription) setWorkspaceDescription(description ?? "");
    }
    setInitialWorkspaceStates();
  }, [topHat]);

  useEffect(() => {
    const setInitialWorkspaceAuthorities = async () => {
      if (!data?.workspace) return;

      setInitialAuthority(
        data.workspace.hatsHatCreatorModule?.authorities,
        currentCreateHatAuthoritiesAddresses,
        setCurrentCreateHatAuthoritiesAddresses,
        setCurrentCreateHatAuthoritiesAccounts,
      );

      setInitialAuthority(
        data.workspace.hatsTimeFrameModule?.authorities,
        currentOperationAuthoritiesAddresses,
        setCurrentOperationAuthoritiesAddresses,
        setCurrentOperationAuthoritiesAccounts,
      );
    }

    const setInitialAuthority = async (
      authorities: {
        address: string;
        authorised: boolean;
        [key: string]: unknown;
      }[] | undefined,
      currentAddresses: string[],
      setCurrentAddresses: (value: React.SetStateAction<string[]>) => void,
      setCurrentAccounts: (value: React.SetStateAction<Account[]>) => void,
    ) => {
      // @todo authorised === true の filter は graphql と ts のどちらで行うか？
      const addresses = authorities?.map((authority) => authority.address);
      if (addresses !== currentAddresses) {
        if (addresses) {
          setCurrentAddresses(addresses);

          const accounts = await fetchNames(addresses);
          setCurrentAccounts(accounts?.[0] as Account[]);
        } else {
          setCurrentAddresses([]);
          setCurrentAccounts([]);
        }
      }
    }

    setInitialWorkspaceAuthorities();
  }, [data]);

  const useResolveAddressEffect = (nameOrAddress: string, address: string | undefined, setAddress: (address: string | undefined) => void) => {
    const resolveAddress = useCallback(async () => {
      let targetAddress = undefined;
      if (nameOrAddress !== "") {
        if (isValidEthAddress(nameOrAddress)) {
          targetAddress = nameOrAddress;
        } else if (!nameOrAddress.startsWith("0x")) {
          // @todo 0x で始まる名前（例：0x-yawn）は resolve しなくてよいのか検討
          const addressesData = await fetchAddresses([nameOrAddress]);
          const resolvedAddress = addressesData?.[0]?.[0]?.address;
          if (resolvedAddress) {
            targetAddress = resolvedAddress;
          }
        }
      }
      if (targetAddress !== address) {
        setAddress(targetAddress);
      }
      console.log("targetAddress:", targetAddress);
    }, [nameOrAddress, address, setAddress]);

    useEffect(() => {
      resolveAddress();
    }, [resolveAddress]);
  };

  useResolveAddressEffect(newCreateHatAuthority, newCreateHatAuthorityAddress, setNewCreateHatAuthorityAddress);
  useResolveAddressEffect(newOperationAuthority, newOperationAuthorityAddress, setNewOperationAuthorityAddress);

  const handleUploadImg = (file: File | undefined) => {
    if (!file?.type?.startsWith("image/")) {
      alert("画像ファイルを選択してください");
      return;
    }
    const imgUrl = file
      ? URL.createObjectURL(file)
      : undefined;
    setImageFile(file);
    setWorkspaceImgUrl(imgUrl);
  }

  return (
    <Box width="100%" pb={10}>
      <PageHeader title="ワークスペース設定" />
      <SettingsSection headingText="ワークスペースの概要">
        <Flex mt={8} width="100%" gap={8} alignItems="center">
          <Box
            mb={4}
            minW="120px"
            maxW="200px"
            w="20%"
            aspectRatio={1}
            bg="gray.100"
            borderRadius="3xl"
          >
            <WorkspaceIcon
              workspaceImageUrl={workspaceImgUrl}
            />
          </Box>
          <Box>
            <CommonButton as="label">
              <Input
                type="file"
                accept="image/*"
                display="none"
                onChange={(e) => {
                  handleUploadImg(e.target.files?.[0])
                }}
              />
              <Text>画像をアップロード</Text>
            </CommonButton>
          </Box>
        </Flex>
        <SettingsSubSection headingText="名前">
          <CommonInput
            // placeholder={workspaceName}
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
          />
        </SettingsSubSection>
        <SettingsSubSection headingText="説明">
          <CommonTextArea
            minHeight="80px"
            // placeholder={workspaceDescription}
            value={workspaceDescription}
            onChange={(e) => setWorkspaceDescription(e.target.value)}
          />
        </SettingsSubSection>
        <CommonButton
          size="lg"
          maxHeight="64px"
          minHeight="48px"
          onClick={() => {}}
        >
          保存
        </CommonButton>
      </SettingsSection>
      <SettingsSection headingText="ワークスペースの権限">
        <RoleSubSection
          addresses={currentCreateHatAuthoritiesAddresses}
          accounts={currentCreateHatAuthoritiesAccounts}
          headingText="役割の新規作成"
          inputAddress={newCreateHatAuthority}
          setInputAddress={setNewCreateHatAuthority}
        />
        <RoleSubSection
          addresses={currentOperationAuthoritiesAddresses}
          accounts={currentOperationAuthoritiesAccounts}
          headingText="役割の割当・休止・剥奪"
          inputAddress={newOperationAuthority}
          setInputAddress={setNewOperationAuthority}
        />
        <SettingsSubSection headingText="オーナー（注意して変更してください）">
          <InputAddressWithButton
            // placeholder="0x1234567890"
            inputAddress={newOwner}
            buttonText="変更"
            color="white"
            backgroundColor="orange.500"
            setInputAddress={setNewOwner}
          />
        </SettingsSubSection>
      </SettingsSection>
    </Box>
  );
};

export default WorkspaceSettings;
